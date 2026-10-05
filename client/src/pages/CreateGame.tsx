import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Settings, Loader } from 'lucide-react';
import { IPLTeam } from '../types';
import { PURSE_OPTIONS, TIMER_OPTIONS, PLAYER_POOL_OPTIONS, SERVER_URL } from '../utils/constants';
import IPLTeamSelector from '../components/IPLTeamSelector';
import { useGameStore } from '../store/gameStore';
import clsx from 'clsx';

export default function CreateGame() {
  const navigate = useNavigate();
  const { initSocket, setMyTeamId, setMyManagerName, setRoom } = useGameStore();

  const [selectedTeam, setSelectedTeam] = useState<IPLTeam | null>(null);
  const [managerName, setManagerName] = useState('');
  const [purse, setPurse] = useState(1000);
  const [timer, setTimer] = useState(10);
  const [playerPool, setPlayerPool] = useState<'QUICK' | 'FULL' | 'CUSTOM'>('FULL');
  const [customCount, setCustomCount] = useState(30);
  const [aiTeams, setAiTeams] = useState(true);
  const [aiDifficulty, setAiDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'team' | 'settings'>('team');

  const handleCreate = async () => {
    if (!selectedTeam) { toast.error('Select a team first!'); return; }
    if (!managerName.trim()) { toast.error('Enter your manager name!'); return; }

    setLoading(true);
    try {
      const socket = initSocket(SERVER_URL);

      const settings = {
        startingPurse: purse,
        bidTimerSeconds: timer,
        playerPool,
        customPlayerCount: playerPool === 'CUSTOM' ? customCount : undefined,
        aiTeams,
        aiDifficulty,
        maxTeams: 10,
      };

      // Try REST API first, fall back to socket
      try {
        const res = await fetch(`${SERVER_URL}/api/rooms/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: selectedTeam.id,
            managerName: managerName.trim(),
            settings,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setRoom(data.room);
          setMyTeamId(selectedTeam.id);
          setMyManagerName(managerName.trim());
          navigate(`/lobby/${data.room.code}`);
          return;
        }
      } catch {
        // Fall back to socket
      }

      // Socket-based creation
      socket.emit('createRoom', {
        teamId: selectedTeam.id,
        managerName: managerName.trim(),
        settings,
      });

      socket.once('roomCreated', (data: { room: { code: string } }) => {
        setMyTeamId(selectedTeam.id);
        setMyManagerName(managerName.trim());
        navigate(`/lobby/${data.room.code}`);
      });

      socket.once('error', (err: { message: string }) => {
        toast.error(err.message);
        setLoading(false);
      });
    } catch (err) {
      toast.error('Failed to create room');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy pt-20 pb-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white">CREATE AUCTION</h1>
            <p className="text-white/50 text-sm">Set up your IPL auction room</p>
          </div>
        </motion.div>

        {/* Step tabs */}
        <div className="flex gap-1 mb-8 bg-white/5 p-1 rounded-xl w-fit">
          {(['team', 'settings'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={clsx(
                'px-5 py-2 rounded-lg font-bold text-sm transition-all capitalize',
                step === s ? 'bg-gold text-navy' : 'text-white/50 hover:text-white'
              )}
            >
              {s === 'team' ? '🏏 Team' : '⚙️ Settings'}
            </button>
          ))}
        </div>

        {/* Step 1: Team Selection */}
        {step === 'team' && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="card">
              <h2 className="section-title mb-4">Choose Your IPL Franchise</h2>
              <IPLTeamSelector
                selectedTeamId={selectedTeam?.id ?? null}
                onSelect={setSelectedTeam}
              />
            </div>

            {selectedTeam && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="card border-gold/30"
                style={{ borderColor: selectedTeam.color }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center font-black text-white text-lg shadow-xl"
                    style={{ background: `linear-gradient(135deg, ${selectedTeam.color}, ${selectedTeam.secondaryColor})` }}
                  >
                    {selectedTeam.abbr}
                  </div>
                  <div>
                    <div className="font-black text-xl text-white">{selectedTeam.name}</div>
                    <div className="text-white/50 text-sm">{selectedTeam.city}</div>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="card">
              <label className="label">Manager Name</label>
              <input
                type="text"
                value={managerName}
                onChange={e => setManagerName(e.target.value)}
                placeholder="Enter your name..."
                className="input-field text-lg font-bold"
                maxLength={20}
              />
            </div>

            <button
              onClick={() => {
                if (!selectedTeam) { toast.error('Select a team!'); return; }
                if (!managerName.trim()) { toast.error('Enter your name!'); return; }
                setStep('settings');
              }}
              className="btn-primary w-full text-lg"
            >
              Next: Configure Settings →
            </button>
          </motion.div>
        )}

        {/* Step 2: Settings */}
        {step === 'settings' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="card">
              <h2 className="section-title flex items-center gap-2 mb-4">
                <Settings size={20} className="text-gold" />
                Auction Settings
              </h2>

              {/* Starting Purse */}
              <div className="mb-6">
                <label className="label">Starting Purse</label>
                <div className="grid grid-cols-3 gap-3">
                  {PURSE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPurse(opt.value)}
                      className={clsx(
                        'py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all',
                        purse === opt.value
                          ? 'border-gold bg-gold/20 text-gold'
                          : 'border-white/10 text-white/60 hover:border-white/30'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timer */}
              <div className="mb-6">
                <label className="label">Bid Timer</label>
                <div className="grid grid-cols-3 gap-3">
                  {TIMER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setTimer(opt.value)}
                      className={clsx(
                        'py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all',
                        timer === opt.value
                          ? 'border-gold bg-gold/20 text-gold'
                          : 'border-white/10 text-white/60 hover:border-white/30'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Player Pool */}
              <div className="mb-6">
                <label className="label">Player Pool</label>
                <div className="grid grid-cols-3 gap-3">
                  {PLAYER_POOL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setPlayerPool(opt.value as 'QUICK' | 'FULL' | 'CUSTOM')}
                      className={clsx(
                        'py-3 px-2 rounded-xl border-2 font-bold text-xs transition-all text-center',
                        playerPool === opt.value
                          ? 'border-gold bg-gold/20 text-gold'
                          : 'border-white/10 text-white/60 hover:border-white/30'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {playerPool === 'CUSTOM' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3"
                  >
                    <label className="label">Custom Player Count (20-100)</label>
                    <input
                      type="number"
                      value={customCount}
                      onChange={e => setCustomCount(Number(e.target.value))}
                      min={20}
                      max={100}
                      className="input-field"
                    />
                  </motion.div>
                )}
              </div>

              {/* AI Teams */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 mb-4">
                <div>
                  <div className="font-bold text-white">AI Teams</div>
                  <div className="text-white/50 text-xs">Fill empty slots with AI managers</div>
                </div>
                <button
                  onClick={() => setAiTeams(!aiTeams)}
                  className={clsx(
                    'w-12 h-6 rounded-full transition-all relative',
                    aiTeams ? 'bg-cricket-green' : 'bg-white/20'
                  )}
                >
                  <div className={clsx(
                    'absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow',
                    aiTeams ? 'left-7' : 'left-1'
                  )} />
                </button>
              </div>

              {aiTeams && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-4"
                >
                  <label className="label">AI Difficulty</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['EASY', 'MEDIUM', 'HARD'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setAiDifficulty(d)}
                        className={clsx(
                          'py-2 px-3 rounded-xl border-2 font-bold text-xs transition-all',
                          aiDifficulty === d
                            ? d === 'EASY'
                              ? 'border-cricket-green bg-cricket-green/20 text-cricket-green'
                              : d === 'MEDIUM'
                              ? 'border-gold bg-gold/20 text-gold'
                              : 'border-danger bg-danger/20 text-danger'
                            : 'border-white/10 text-white/60 hover:border-white/30'
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Summary */}
            <div className="card border-gold/20 bg-gold/5">
              <h3 className="font-bold text-gold mb-3 text-sm uppercase tracking-wider">Summary</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">Team</span>
                  <span className="font-bold text-white">{selectedTeam?.abbr}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Manager</span>
                  <span className="font-bold text-white">{managerName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Purse</span>
                  <span className="font-bold text-gold">₹{purse}L</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Timer</span>
                  <span className="font-bold text-white">{timer}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Players</span>
                  <span className="font-bold text-white">{playerPool}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">AI Teams</span>
                  <span className="font-bold text-white">{aiTeams ? aiDifficulty : 'OFF'}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('team')} className="btn-secondary flex-1">
                ← Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="btn-primary flex-[2] flex items-center justify-center gap-2 text-lg"
              >
                {loading ? (
                  <><Loader size={20} className="animate-spin" /> Creating...</>
                ) : (
                  '🏏 CREATE ROOM'
                )}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
