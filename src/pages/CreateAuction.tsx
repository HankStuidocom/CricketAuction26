import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ALL_FRANCHISES, getOrCreateUserId, saveRoomSession } from '../lib/utils';
import { safeFetch } from '../lib/api';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import { 
  CricketBatBallIcon, 
  GavelIcon, 
  ShieldCrestIcon, 
  PrivateLockIcon, 
  BotsAiIcon, 
  TimerGaugeIcon, 
  PurseCoinsIcon, 
  CheckmarkIcon 
} from '../components/GameIcons';
import { ArrowLeft, ChevronRight, ChevronLeft, Shield, AlertCircle } from 'lucide-react';

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
  const [password, setPassword] = useState('');
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

    const hostId = getOrCreateUserId();

    const payload = {
      hostId,
      hostFranchise: selectedFranchise,
      hostDisplayName: displayName,
      roomConfig: {
        name: roomName,
        isPrivate,
        password,
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

  return (
    <div className="min-h-screen bg-[#020814] text-[#F8FAFC] py-6 px-4 sm:px-6 max-w-5xl mx-auto font-['DM_Sans',sans-serif]">
      
      {/* Top Header with Back Navigation */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/8">
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

      {/* Esports Tournament Step Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between max-w-md mx-auto mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-['Manrope'] font-black text-xs ${step >= 1 ? 'bg-[#D9FF4D] text-[#051120]' : 'bg-white/10 text-[#8993A8]'}`}>
              1
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${step === 1 ? 'text-white' : 'text-[#8993A8]'}`}>
              Franchise
            </span>
          </div>

          <div className="h-[2px] w-12 bg-white/15">
            <div className={`h-full bg-[#D9FF4D] transition-all duration-300 ${step >= 2 ? 'w-full' : 'w-0'}`} />
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-['Manrope'] font-black text-xs ${step >= 2 ? 'bg-[#D9FF4D] text-[#051120]' : 'bg-white/10 text-[#8993A8]'}`}>
              2
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${step === 2 ? 'text-white' : 'text-[#8993A8]'}`}>
              Arena Rules
            </span>
          </div>

          <div className="h-[2px] w-12 bg-white/15">
            <div className={`h-full bg-[#D9FF4D] transition-all duration-300 ${step >= 3 ? 'w-full' : 'w-0'}`} />
          </div>

          <div className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-['Manrope'] font-black text-xs ${step === 3 ? 'bg-[#D9FF4D] text-[#051120]' : 'bg-white/10 text-[#8993A8]'}`}>
              3
            </span>
            <span className={`text-xs font-bold uppercase tracking-wider ${step === 3 ? 'text-white' : 'text-[#8993A8]'}`}>
              Launch
            </span>
          </div>
        </div>

        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-['Manrope'] text-white">
            {step === 1 && 'Select Your Franchise'}
            {step === 2 && 'Tournament Configuration'}
            {step === 3 && 'Arena Launchpad'}
          </h1>
          <p className="text-xs sm:text-sm text-[#8993A8] mt-0.5">
            {step === 1 && 'Choose the IPL franchise you want to lead as the franchise boss.'}
            {step === 2 && 'Set starting purse, squad capacity, bid timers, and AI bots.'}
            {step === 3 && 'Review your auction settings and open the live tournament lobby.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/15 border border-red-500/30 text-red-300 rounded-2xl text-xs sm:text-sm font-medium flex items-center gap-2">
          <AlertCircle size={18} className="text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Wizard Container */}
      <GamePanel glow="none" className="p-0">
        
        {/* STEP 1: FRANCHISE SELECTION */}
        {step === 1 && (
          <div className="p-5 sm:p-7 space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 font-['Manrope']">
                Your Host Gamer Tag
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your boss name"
                className="w-full bg-[#050E1D] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-3 font-['Manrope'] flex items-center justify-between">
                <span>Select IPL Franchise (Selected: {selectedTeamData.name})</span>
                <span className="text-[#D9FF4D] font-mono text-[11px]">10 AVAILABLE</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {ALL_FRANCHISES.map((team) => {
                  const isSelected = selectedFranchise === team.id;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => setSelectedFranchise(team.id)}
                      className={`group relative p-3 sm:p-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-between min-h-[150px] sm:min-h-[165px] ${
                        isSelected 
                          ? 'border-[#D9FF4D] bg-[#0E2042] shadow-[0_0_24px_rgba(217,255,77,0.3)] scale-[1.02]' 
                          : 'border-white/10 bg-[#050D1C] hover:border-white/25 hover:bg-[#08152B]'
                      }`}
                    >
                      {/* Selected Checkmark Badge */}
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#D9FF4D] text-[#051120] flex items-center justify-center shadow">
                          <CheckmarkIcon size={12} color="#051120" />
                        </div>
                      )}

                      {/* Team Logo */}
                      <div className="w-full flex-1 flex items-center justify-center py-1 sm:py-2">
                        {team.logoUrl ? (
                          <img 
                            src={team.logoUrl} 
                            alt={team.id} 
                            className="h-16 sm:h-20 w-auto max-w-[85%] object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] transition-transform duration-200 group-hover:scale-105" 
                          />
                        ) : (
                          <span className="text-3xl sm:text-4xl">{team.emoji}</span>
                        )}
                      </div>

                      {/* Team Name & Code */}
                      <div className="w-full text-center mt-1">
                        <div className="text-base sm:text-lg font-black tracking-wider leading-tight font-['Manrope']" style={{ color: team.primary }}>
                          {team.id}
                        </div>
                        <div className="text-[11px] text-[#8993A8] truncate font-medium mt-0.5">
                          {team.name}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex justify-end border-t border-white/8">
              <GameButton
                type="button"
                onClick={() => setStep(2)}
                variant="primary"
                size="md"
                iconRight={<ChevronRight size={16} />}
              >
                Next: Arena Rules
              </GameButton>
            </div>
          </div>
        )}

        {/* STEP 2: ARENA SETTINGS */}
        {step === 2 && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 font-['Manrope']">
                  Arena Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full bg-[#050E1D] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 font-['Manrope'] flex items-center justify-between">
                  <span>Starting Purse (₹ Crore)</span>
                  <span className="text-[#D9FF4D] font-mono">₹{startingPurseCr} Cr</span>
                </label>
                <input
                  type="number"
                  min={50}
                  max={200}
                  value={startingPurseCr}
                  onChange={(e) => setStartingPurseCr(Number(e.target.value))}
                  className="w-full bg-[#050E1D] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 font-['Manrope']">
                  Squad Size Limit (Per Team)
                </label>
                <input
                  type="number"
                  min={5}
                  max={25}
                  value={maxSquadSize}
                  onChange={(e) => setMaxSquadSize(Number(e.target.value))}
                  className="w-full bg-[#050E1D] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 font-['Manrope']">
                  Max Teams in Room
                </label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={maxTeams}
                  onChange={(e) => setMaxTeams(Number(e.target.value))}
                  className="w-full bg-[#050E1D] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 font-['Manrope'] flex items-center justify-between">
                  <span>Bid Countdown Timer</span>
                  <span className="text-[#00E5FF] font-mono">{isUnlimitedTimer ? 'Unlimited Mode' : `${bidTimerSeconds}s`}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    disabled={isUnlimitedTimer}
                    min={5}
                    max={60}
                    value={bidTimerSeconds}
                    onChange={(e) => setBidTimerSeconds(Number(e.target.value))}
                    className="w-2/3 bg-[#050E1D] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] font-bold disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={() => setIsUnlimitedTimer(!isUnlimitedTimer)}
                    className={`w-1/3 px-3 py-2 text-xs font-black rounded-xl border transition uppercase tracking-wider font-['Manrope'] ${
                      isUnlimitedTimer 
                        ? 'border-[#D9FF4D] bg-[#D9FF4D]/20 text-[#D9FF4D]' 
                        : 'border-white/12 bg-[#050E1D] text-[#8993A8]'
                    }`}
                  >
                    Unlimited
                  </button>
                </div>
              </div>

              {/* Private Room Toggle */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 font-['Manrope']">
                  Room Security
                </label>
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`w-full p-3 rounded-xl border flex items-center justify-between transition ${
                    isPrivate ? 'border-[#00E5FF] bg-[#00E5FF]/10 text-white' : 'border-white/12 bg-[#050E1D] text-[#8993A8]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <PrivateLockIcon size={16} color={isPrivate ? '#00E5FF' : '#8993A8'} />
                    <span className="text-xs font-bold">{isPrivate ? 'Private (Password Required)' : 'Public (Anyone Can Join)'}</span>
                  </div>
                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${isPrivate ? 'border-[#00E5FF] bg-[#00E5FF]' : 'border-white/20'}`}>
                    {isPrivate && <CheckmarkIcon size={10} color="#051120" />}
                  </span>
                </button>
              </div>
            </div>

            {isPrivate && (
              <div className="p-4 bg-[#050E1D] border border-[#00E5FF]/30 rounded-xl">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#00E5FF] mb-2 font-['Manrope']">
                  Set Room Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a secret password"
                  className="w-full bg-[#020814] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#00E5FF] font-bold"
                />
              </div>
            )}

            {/* AI Toggle */}
            <div className="p-4 bg-[#050E1D] border border-purple-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                  <BotsAiIcon size={20} color="#D8B4FE" />
                </div>
                <div>
                  <div className="font-['Manrope'] font-black text-sm text-white">Fill Open Slots with AI Bots</div>
                  <div className="text-xs text-[#8993A8]">Autonomous AI will bid strategically to complete rosters</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {aiEnabled && (
                  <select
                    value={aiDifficulty}
                    onChange={(e: any) => setAiDifficulty(e.target.value)}
                    className="bg-[#020814] border border-purple-500/40 rounded-xl px-3 py-1.5 text-xs text-purple-300 font-bold focus:outline-none"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>
                )}

                <button
                  type="button"
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                    aiEnabled ? 'bg-[#D9FF4D] justify-end' : 'bg-gray-700 justify-start'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${aiEnabled ? 'bg-[#051120]' : 'bg-white'}`} />
                </button>
              </div>
            </div>

            <div className="pt-4 flex justify-between border-t border-white/8">
              <GameButton
                type="button"
                onClick={() => setStep(1)}
                variant="glass"
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
                Review Summary
              </GameButton>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW & LAUNCH */}
        {step === 3 && (
          <div className="p-5 sm:p-7 space-y-6">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0C1E3C] to-[#071329] border border-white/10 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2">
                <img 
                  src={selectedTeamData.logoUrl} 
                  alt={selectedTeamData.name} 
                  className="max-h-full object-contain drop-shadow" 
                />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D9FF4D] block">
                  ARENA HOST FRANCHISE
                </span>
                <h3 className="font-['Manrope'] font-black text-xl text-white">
                  {selectedTeamData.name} ({selectedTeamData.id})
                </h3>
                <p className="text-xs text-[#8993A8]">
                  Host Owner: <span className="text-white font-bold">{displayName}</span> · Arena: <span className="text-white font-bold">{roomName}</span>
                </p>
              </div>
            </div>

            {/* Parameter Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[#050E1D] border border-white/10">
                <span className="text-[10px] text-[#8993A8] font-bold block uppercase">Starting Purse</span>
                <p className="font-['Manrope'] font-black text-base text-[#D9FF4D]">₹{startingPurseCr} Cr</p>
              </div>
              <div className="p-3 rounded-xl bg-[#050E1D] border border-white/10">
                <span className="text-[10px] text-[#8993A8] font-bold block uppercase">Squad Size</span>
                <p className="font-['Manrope'] font-black text-base text-white">{maxSquadSize} Players</p>
              </div>
              <div className="p-3 rounded-xl bg-[#050E1D] border border-white/10">
                <span className="text-[10px] text-[#8993A8] font-bold block uppercase">Bid Timer</span>
                <p className="font-['Manrope'] font-black text-base text-[#00E5FF]">
                  {isUnlimitedTimer ? 'Unlimited' : `${bidTimerSeconds}s`}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#050E1D] border border-white/10">
                <span className="text-[10px] text-[#8993A8] font-bold block uppercase">Max Teams</span>
                <p className="font-['Manrope'] font-black text-base text-white">{maxTeams} Teams</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-[#050E1D] border border-white/10">
                <span className="text-[10px] text-[#8993A8] font-bold block uppercase">Privacy</span>
                <p className="font-['Manrope'] font-black text-sm text-white">
                  {isPrivate ? '🔒 Private (Password)' : '🌐 Public'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#050E1D] border border-white/10">
                <span className="text-[10px] text-[#8993A8] font-bold block uppercase">AI Bots</span>
                <p className="font-['Manrope'] font-black text-sm text-white">
                  {aiEnabled ? `🤖 Active (${aiDifficulty})` : 'Disabled'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#050E1D] border border-white/10">
                <span className="text-[10px] text-[#8993A8] font-bold block uppercase">Player Pool</span>
                <p className="font-['Manrope'] font-black text-sm text-white">IPL 2026 (250 Players)</p>
              </div>
            </div>

            <div className="pt-4 flex justify-between border-t border-white/8">
              <GameButton
                type="button"
                onClick={() => setStep(2)}
                variant="glass"
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
                icon={<GavelIcon size={18} color="#051120" />}
              >
                LAUNCH ARENA & OPEN LOBBY
              </GameButton>
            </div>
          </div>
        )}

      </GamePanel>

    </div>
  );
}
