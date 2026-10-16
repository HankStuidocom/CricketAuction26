import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_FRANCHISES, getOrCreateUserId, saveRoomSession } from '../lib/utils';
import { safeFetch, warmupServer } from '../lib/api';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import { 
  CricketBatBallIcon, 
  GavelIcon, 
  PrivateLockIcon, 
  BotsAiIcon, 
  CheckmarkIcon,
  CrownHostIcon
} from '../components/GameIcons';
import { ArrowLeft, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import { ServerHealthBadge } from '../components/ServerHealthBadge';

export default function CreateAuction() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Warmup backend server as soon as user opens Create Auction flow
  useEffect(() => {
    warmupServer();
  }, []);

  // Step 1: Franchise & Display Name
  const [selectedFranchise, setSelectedFranchise] = useState('CSK');
  const [displayName, setDisplayName] = useState(() => {
    try {
      const user = JSON.parse(localStorage.getItem('ca26_user') || '{}');
      return user.display_name || user.username || 'Tactical Boss';
    } catch {
      return 'Tactical Boss';
    }
  });

  // Step 2: Settings
  const [roomName, setRoomName] = useState('IPL 2026 Room');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [maxTeams, setMaxTeams] = useState(10);
  const [maxSquadSize, setMaxSquadSize] = useState(10);
  const [minSquadSize, setMinSquadSize] = useState(5);
  const [startingPurseCr, setStartingPurseCr] = useState(120);
  const [bidTimerSeconds, setBidTimerSeconds] = useState(10);
  const [isUnlimitedTimer, setIsUnlimitedTimer] = useState(false);
  const [poolSizePreset, setPoolSizePreset] = useState<'40' | '80' | '250' | 'CUSTOM'>('250');
  const [customPoolSize, setCustomPoolSize] = useState<number>(100);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');

  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreateRoom = async () => {
    setLoading(true);
    setError('');

    const hostId = getOrCreateUserId();

    const payload = {
      idempotencyKey,
      hostId,
      hostFranchise: selectedFranchise,
      hostDisplayName: displayName,
      roomConfig: {
        name: roomName,
        isPrivate,
        password,
        maxTeams,
        maxSquadSize,
        minSquadSize,
        poolSize: poolSizePreset === 'CUSTOM' ? customPoolSize : Number(poolSizePreset),
        startingPurse: startingPurseCr * 100, // into Lakhs
        bidTimer: bidTimerSeconds,
        isUnlimited: isUnlimitedTimer,
        aiEnabled,
        aiDifficulty
      }
    };

    try {
      const data = await safeFetch<{ success: boolean; roomCode: string; hostToken?: string }>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify(payload),
        retries: 3,
        retryDelay: 3000
      });

      if (data.hostToken) {
        localStorage.setItem(`ca26_host_token_${data.roomCode}`, data.hostToken);
      }
      
      saveRoomSession(data.roomCode, {
        franchise: selectedFranchise,
        displayName,
        userId: hostId,
        password: isPrivate ? password : undefined
      });

      navigate(`/room/${data.roomCode}`, {
        state: { displayName, franchise: selectedFranchise, userId: hostId }
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedTeamData = ALL_FRANCHISES.find(f => f.id === selectedFranchise) || ALL_FRANCHISES[0];
  const isGameManager = selectedFranchise === 'ADMIN';

  return (
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] py-6 px-4 sm:px-6 max-w-5xl mx-auto font-sans">
      
      {/* Top Header with Back Navigation */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-[#1F2937]">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-[6px] bg-[#111827] border border-[#1F2937] flex items-center justify-center text-[#86948A] hover:text-[#DFE2EF] hover:border-[#10B981] transition"
          title="Back to Home"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-lg tracking-tight text-white">
            CRICK<span className="text-[#10B981]">AUCTION</span>
          </span>
          <span className="text-[10px] font-mono font-bold text-[#86948A] bg-[#1C1F29] px-1.5 py-0.5 rounded-[4px] border border-[#1F2937]">
            SETUP
          </span>
        </div>

        <ServerHealthBadge compact />
      </div>

      {/* Step Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between max-w-md mx-auto mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-[4px] flex items-center justify-center font-display font-black text-xs transition-colors ${
              step >= 1 
                ? 'bg-[#10B981] text-[#090D16] shadow-[0_0_12px_rgba(16,185,129,0.35)]' 
                : 'bg-[#1C1F29] text-[#86948A] border border-[#1F2937]'
            }`}>
              1
            </span>
            <span className={`text-[11px] font-display font-bold uppercase tracking-wider ${step === 1 ? 'text-[#10B981]' : 'text-[#86948A]'}`}>
              Team
            </span>
          </div>

          <div className="h-[2px] w-12 bg-[#1F2937]">
            <div className={`h-full bg-[#10B981] transition-all duration-300 ${step >= 2 ? 'w-full' : 'w-0'}`} />
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-[4px] flex items-center justify-center font-display font-black text-xs transition-colors ${
              step >= 2 
                ? 'bg-[#10B981] text-[#090D16] shadow-[0_0_12px_rgba(16,185,129,0.35)]' 
                : 'bg-[#1C1F29] text-[#86948A] border border-[#1F2937]'
            }`}>
              2
            </span>
            <span className={`text-[11px] font-display font-bold uppercase tracking-wider ${step === 2 ? 'text-[#10B981]' : 'text-[#86948A]'}`}>
              Settings
            </span>
          </div>

          <div className="h-[2px] w-12 bg-[#1F2937]">
            <div className={`h-full bg-[#10B981] transition-all duration-300 ${step >= 3 ? 'w-full' : 'w-0'}`} />
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-[4px] flex items-center justify-center font-display font-black text-xs transition-colors ${
              step === 3 
                ? 'bg-[#10B981] text-[#090D16] shadow-[0_0_12px_rgba(16,185,129,0.35)]' 
                : 'bg-[#1C1F29] text-[#86948A] border border-[#1F2937]'
            }`}>
              3
            </span>
            <span className={`text-[11px] font-display font-bold uppercase tracking-wider ${step === 3 ? 'text-[#10B981]' : 'text-[#86948A]'}`}>
              Create
            </span>
          </div>
        </div>

        <div className="text-center sm:text-left">
          <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white uppercase">
            {step === 1 && 'Select Team'}
            {step === 2 && 'Room Settings'}
            {step === 3 && 'Review & Create'}
          </h1>
        </div>
      </div>

      {error && (
        <div className={`mb-6 p-4 rounded-[6px] text-xs font-medium border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          error.includes('waking up') || error.includes('sleep')
            ? 'bg-[#10B981]/10 border-[#10B981]/40 text-[#6FFBBE]'
            : 'bg-[#EF4444]/15 border-[#EF4444]/40 text-[#FFB4AB]'
        }`}>
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className={error.includes('waking up') || error.includes('sleep') ? 'text-[#10B981] flex-shrink-0' : 'text-[#EF4444] flex-shrink-0'} />
            <div>
              <p className="font-bold">{error.includes('waking up') || error.includes('sleep') ? 'Server Spin-Up in Progress' : 'Notice'}</p>
              <p className="opacity-90 mt-0.5">{error}</p>
            </div>
          </div>
          {step === 3 && (
            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={loading}
              className="px-3.5 py-1.5 rounded-[4px] bg-[#10B981] text-[#090D16] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#6FFBBE] transition shadow flex-shrink-0"
            >
              Retry Create Now
            </button>
          )}
        </div>
      )}

      {/* Step Wizard Container */}
      <GamePanel glow="none" className="p-0">
        
        {/* STEP 1: FRANCHISE SELECTION */}
        {step === 1 && (
          <div className="p-5 sm:p-7 space-y-6">
            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-2">
                Player Tag
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter player tag"
                className="w-full bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-4 py-2.5 text-sm text-[#DFE2EF] focus:outline-none focus:border-[#10B981] font-display font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-3 flex items-center justify-between">
                <span>Select Team</span>
                <span className="text-[#10B981] font-mono text-[11px]">10 TEAMS + ADMIN</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFranchise('ADMIN')}
                  className={`group relative p-3 sm:p-4 rounded-[6px] border text-center transition-all flex flex-col items-center justify-between min-h-[145px] ${
                    isGameManager
                      ? 'border-[#F59E0B] bg-[#2A2114] shadow-[0_0_20px_rgba(245,158,11,0.22)]'
                      : 'border-[#1F2937] bg-[#111827] hover:border-[#66523A] hover:bg-[#181B25]'
                  }`}
                >
                  {isGameManager && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-[4px] bg-[#F59E0B] text-[#090D16] flex items-center justify-center shadow">
                      <CheckmarkIcon size={10} color="#090D16" />
                    </div>
                  )}
                  <div className="w-16 h-16 rounded-full border border-[#F59E0B]/50 bg-[#F59E0B]/10 flex items-center justify-center shadow-[inset_0_0_16px_rgba(245,158,11,0.12)]">
                    <CrownHostIcon size={34} color="#F59E0B" />
                  </div>
                  <div className="w-full text-center mt-1">
                    <div className="text-base font-display font-black tracking-wider leading-tight text-[#FFB95F]">ADMIN</div>
                    <div className="text-[11px] text-[#86948A] font-medium mt-0.5">Game Manager</div>
                  </div>
                </button>
                {ALL_FRANCHISES.map((team) => {
                  const isSelected = selectedFranchise === team.id;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedFranchise(team.id)}
                      className={`group relative p-3 sm:p-4 rounded-[6px] border text-center transition-all flex flex-col items-center justify-between min-h-[145px] ${
                        isSelected 
                          ? 'border-[#10B981] bg-[#1C1F29] shadow-[0_0_20px_rgba(16,185,129,0.25)]' 
                          : 'border-[#1F2937] bg-[#111827] hover:border-[#3C4A42] hover:bg-[#181B25]'
                      }`}
                    >
                      {/* Selected Checkmark Badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-[4px] bg-[#10B981] text-[#090D16] flex items-center justify-center shadow">
                          <CheckmarkIcon size={10} color="#090D16" />
                        </div>
                      )}

                      {/* Team Logo */}
                      <div className="w-full flex-1 flex items-center justify-center py-1">
                        {team.logoUrl ? (
                          <img 
                            src={team.logoUrl} 
                            alt={team.id} 
                            className="h-16 w-auto max-w-[85%] object-contain drop-shadow transition-transform duration-150 group-hover:scale-105" 
                          />
                        ) : (
                          <span className="text-3xl">{team.emoji}</span>
                        )}
                      </div>

                      {/* Team Name & Code */}
                      <div className="w-full text-center mt-1">
                        <div className="text-base font-display font-black tracking-wider leading-tight" style={{ color: team.primary }}>
                          {team.id}
                        </div>
                        <div className="text-[11px] text-[#86948A] truncate font-medium mt-0.5">
                          {team.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex justify-end border-t border-[#1F2937]">
              <GameButton
                type="button"
                onClick={() => setStep(2)}
                variant="primary"
                size="md"
                iconRight={<ChevronRight size={16} />}
              >
                Continue: Settings
              </GameButton>
            </div>
          </div>
        )}

        {/* STEP 2: ARENA SETTINGS */}
        {step === 2 && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-2">
                  Room Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-4 py-2.5 text-sm text-[#DFE2EF] focus:outline-none focus:border-[#10B981] font-display font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-2 flex items-center justify-between">
                  <span>Starting Purse (₹ Crore)</span>
                  <span className="text-[#10B981] font-mono">₹{startingPurseCr} Cr</span>
                </label>
                <input
                  type="number"
                  min={50}
                  max={200}
                  value={startingPurseCr}
                  onChange={(e) => setStartingPurseCr(Number(e.target.value))}
                  className="w-full bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-4 py-2.5 text-sm text-[#DFE2EF] focus:outline-none focus:border-[#10B981] font-mono font-bold"
                />
              </div>

              {/* Player Pool Selection */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-2 flex items-center justify-between">
                  <span>Player Pool Preset</span>
                  <span className="text-[#10B981] font-mono font-bold">
                    {poolSizePreset === 'CUSTOM' ? `${customPoolSize} Players` : `${poolSizePreset} Players`}
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: '40', label: 'Blitz 40', sub: '~15 mins match' },
                    { id: '80', label: 'Standard 80', sub: '~30 mins game' },
                    { id: '250', label: 'Mega 250', sub: 'Full player pool' },
                    { id: 'CUSTOM', label: 'Custom Pool', sub: 'Manual count' },
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setPoolSizePreset(preset.id as any)}
                      className={`p-2.5 rounded-[6px] border text-left transition ${
                        poolSizePreset === preset.id
                          ? 'border-[#10B981] bg-[#10B981]/15 text-[#10B981] shadow-sm'
                          : 'border-[#1F2937] bg-[#111827] text-[#86948A] hover:border-[#3C4A42]'
                      }`}
                    >
                      <div className="font-display font-bold text-xs">{preset.label}</div>
                      <div className="text-[10px] text-[#86948A] mt-0.5">{preset.sub}</div>
                    </button>
                  ))}
                </div>
                {poolSizePreset === 'CUSTOM' && (
                  <div className="mt-2.5">
                    <input
                      type="number"
                      min={10}
                      max={250}
                      value={customPoolSize}
                      onChange={(e) => setCustomPoolSize(Number(e.target.value))}
                      className="w-full bg-[#0F131C] border border-[#10B981]/50 rounded-[6px] px-3.5 py-2 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#10B981]"
                      placeholder="Enter custom count (10-250)"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-2 flex items-center justify-between">
                  <span>Min Squad Size</span>
                  <span className="text-[#10B981] font-mono">{minSquadSize} Players</span>
                </label>
                <input
                  type="number"
                  min={3}
                  max={maxSquadSize}
                  value={minSquadSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMinSquadSize(Math.min(maxSquadSize, Math.max(3, val)));
                  }}
                  className="w-full bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-4 py-2.5 text-sm text-[#DFE2EF] focus:outline-none focus:border-[#10B981] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-2 flex items-center justify-between">
                  <span>Max Squad Size</span>
                  <span className="text-[#10B981] font-mono">{maxSquadSize} Players</span>
                </label>
                <input
                  type="number"
                  min={Math.max(5, minSquadSize)}
                  max={25}
                  value={maxSquadSize}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMaxSquadSize(val);
                    if (minSquadSize > val) setMinSquadSize(val);
                  }}
                  className="w-full bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-4 py-2.5 text-sm text-[#DFE2EF] focus:outline-none focus:border-[#10B981] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-2">
                  Max Teams in Room
                </label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={maxTeams}
                  onChange={(e) => setMaxTeams(Number(e.target.value))}
                  className="w-full bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-4 py-2.5 text-sm text-[#DFE2EF] focus:outline-none focus:border-[#10B981] font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-2 flex items-center justify-between">
                  <span>Bid Countdown Timer</span>
                  <span className="text-[#10B981] font-mono">{isUnlimitedTimer ? 'Unlimited Mode' : `${bidTimerSeconds}s`}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    disabled={isUnlimitedTimer}
                    min={5}
                    max={60}
                    value={bidTimerSeconds}
                    onChange={(e) => setBidTimerSeconds(Number(e.target.value))}
                    className="w-2/3 bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-4 py-2.5 text-sm text-[#DFE2EF] focus:outline-none focus:border-[#10B981] font-mono font-bold disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={() => setIsUnlimitedTimer(!isUnlimitedTimer)}
                    className={`w-1/3 px-3 py-2 text-xs font-display font-bold rounded-[6px] border transition uppercase tracking-wider ${
                      isUnlimitedTimer 
                        ? 'border-[#10B981] bg-[#10B981]/20 text-[#10B981]' 
                        : 'border-[#1F2937] bg-[#111827] text-[#86948A] hover:border-[#3C4A42]'
                    }`}
                  >
                    Unlimited
                  </button>
                </div>
              </div>

              {/* Private Room Security */}
              <div>
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-2">
                  Room Security Mode
                </label>
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`w-full p-2.5 rounded-[6px] border flex items-center justify-between transition ${
                    isPrivate 
                      ? 'border-[#06B6D4] bg-[#06B6D4]/10 text-white' 
                      : 'border-[#1F2937] bg-[#111827] text-[#86948A] hover:border-[#3C4A42]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <PrivateLockIcon size={15} color={isPrivate ? '#06B6D4' : '#86948A'} />
                    <span className="text-xs font-bold">{isPrivate ? 'Private (Password Required)' : 'Public Room'}</span>
                  </div>
                  <span className={`w-4 h-4 rounded-[4px] border flex items-center justify-center ${isPrivate ? 'border-[#06B6D4] bg-[#06B6D4]' : 'border-[#1F2937]'}`}>
                    {isPrivate && <CheckmarkIcon size={10} color="#003640" />}
                  </span>
                </button>
              </div>
            </div>

            {isPrivate && (
              <div className="p-4 bg-[#111827] border border-[#06B6D4]/40 rounded-[6px]">
                <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#06B6D4] mb-2">
                  Set Room Passkey
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secret room password"
                  className="w-full bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#06B6D4] font-mono font-bold"
                />
              </div>
            )}

            {/* AI Toggle */}
            <div className="p-4 bg-[#111827] border border-[#1F2937] rounded-[6px] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[6px] bg-[#1C1F29] border border-[#1F2937] text-[#10B981] flex items-center justify-center">
                  <BotsAiIcon size={18} color="#10B981" />
                </div>
                <div>
                  <div className="font-display font-bold text-sm text-white">Fill Open Slots with AI Franchise Bots</div>
                  <div className="text-xs text-[#86948A]">Autonomous algorithms calculate bids based on squad needs</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {aiEnabled && (
                  <select
                    value={aiDifficulty}
                    onChange={(e: any) => setAiDifficulty(e.target.value)}
                    className="bg-[#0F131C] border border-[#10B981]/50 rounded-[4px] px-3 py-1.5 text-xs text-[#10B981] font-mono font-bold focus:outline-none"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition ${
                    aiEnabled ? 'bg-[#10B981] justify-end' : 'bg-[#1C1F29] border border-[#1F2937] justify-start'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${aiEnabled ? 'bg-[#090D16]' : 'bg-[#86948A]'}`} />
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-between border-t border-[#1F2937]">
              <GameButton
                type="button"
                onClick={() => setStep(1)}
                variant="secondary"
                size="md"
                icon={<ChevronLeft size={16} />}
              >
                Back
              </GameButton>

              <GameButton
                type="button"
                onClick={() => setStep(3)}
                variant="primary"
                size="md"
                iconRight={<ChevronRight size={16} />}
              >
                Review & Create
              </GameButton>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & CREATE */}
        {step === 3 && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="p-4 rounded-[6px] bg-[#181B25] border border-[#1F2937] flex items-center gap-4">
              <div className="w-14 h-14 rounded-[4px] bg-[#111827] border border-[#1F2937] flex items-center justify-center p-2">
                {isGameManager ? <CrownHostIcon size={32} color="#F59E0B" /> : <img src={selectedTeamData.logoUrl} alt={selectedTeamData.name} className="max-h-full object-contain drop-shadow" />}
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#10B981] block">
                  {isGameManager ? 'NON-PLAYING ADMIN ROLE' : 'HOST TEAM'}
                </span>
                <h3 className="font-display font-black text-xl text-white">
                  {isGameManager ? 'Game Manager Console' : `${selectedTeamData.name} (${selectedTeamData.id})`}
                </h3>
                <p className="text-xs text-[#86948A]">
                  Player: <span className="text-[#DFE2EF] font-bold">{displayName}</span> · {isGameManager ? 'No team slot or bidding access' : 'Plays as a team'} · Room: <span className="text-[#DFE2EF] font-bold">{roomName}</span>
                </p>
              </div>
            </div>

            {/* Parameter Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-[4px] bg-[#0F131C] border border-[#1F2937]">
                <span className="text-[10px] text-[#86948A] font-display font-bold block uppercase">Starting Purse</span>
                <p className="font-mono font-bold text-base text-[#10B981]">₹{startingPurseCr} Cr</p>
              </div>
              <div className="p-3 rounded-[4px] bg-[#0F131C] border border-[#1F2937]">
                <span className="text-[10px] text-[#86948A] font-display font-bold block uppercase">Squad Limits</span>
                <p className="font-mono font-bold text-base text-white">{minSquadSize} - {maxSquadSize} Players</p>
              </div>
              <div className="p-3 rounded-[4px] bg-[#0F131C] border border-[#1F2937]">
                <span className="text-[10px] text-[#86948A] font-display font-bold block uppercase">Bid Timer</span>
                <p className="font-mono font-bold text-base text-[#10B981]">
                  {isUnlimitedTimer ? 'Unlimited' : `${bidTimerSeconds}s`}
                </p>
              </div>
              <div className="p-3 rounded-[4px] bg-[#0F131C] border border-[#1F2937]">
                <span className="text-[10px] text-[#86948A] font-display font-bold block uppercase">Max Teams</span>
                <p className="font-mono font-bold text-base text-white">{maxTeams} Teams</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-[4px] bg-[#0F131C] border border-[#1F2937]">
                <span className="text-[10px] text-[#86948A] font-display font-bold block uppercase">Security</span>
                <p className="font-display font-bold text-xs text-white">
                  {isPrivate ? '🔒 Private (Passkey)' : '🌐 Public Room'}
                </p>
              </div>
              <div className="p-3 rounded-[4px] bg-[#0F131C] border border-[#1F2937]">
                <span className="text-[10px] text-[#86948A] font-display font-bold block uppercase">AI Teams</span>
                <p className="font-display font-bold text-xs text-white">
                  {aiEnabled ? `🤖 Active (${aiDifficulty})` : 'Disabled'}
                </p>
              </div>
              <div className="p-3 rounded-[4px] bg-[#0F131C] border border-[#1F2937]">
                <span className="text-[10px] text-[#86948A] font-display font-bold block uppercase">Player Pool</span>
                <p className="font-display font-bold text-xs text-white">
                  {poolSizePreset === 'CUSTOM' ? `${customPoolSize} Players` : `${poolSizePreset} Players`}
                </p>
              </div>
            </div>

            <div className="pt-4 flex justify-between border-t border-[#1F2937]">
              <GameButton
                type="button"
                onClick={() => setStep(2)}
                variant="secondary"
                size="md"
                icon={<ChevronLeft size={16} />}
              >
                Back
              </GameButton>

              <GameButton
                type="button"
                disabled={loading}
                loading={loading}
                onClick={handleCreateRoom}
                variant="primary"
                size="lg"
                icon={<GavelIcon size={18} color="#090D16" />}
              >
                {loading ? 'Creating Room...' : 'Create Room'}
              </GameButton>
            </div>
          </div>
        )}

      </GamePanel>

    </div>
  );
}
