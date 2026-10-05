import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader } from 'lucide-react';
import { IPLTeam, Room } from '../types';
import { SERVER_URL } from '../utils/constants';
import IPLTeamSelector from '../components/IPLTeamSelector';
import { useGameStore } from '../store/gameStore';

export default function JoinGame() {
  const navigate = useNavigate();
  const { initSocket, setMyTeamId, setMyManagerName } = useGameStore();

  const [roomCode, setRoomCode] = useState('');
  const [managerName, setManagerName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<IPLTeam | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingRoom, setFetchingRoom] = useState(false);
  const [roomData, setRoomData] = useState<Room | null>(null);
  const [takenTeams, setTakenTeams] = useState<string[]>([]);

  // Fetch room info when code is 6 chars
  useEffect(() => {
    const code = roomCode.trim().toUpperCase();
    if (code.length === 6) {
      fetchRoomInfo(code);
    } else {
      setRoomData(null);
      setTakenTeams([]);
    }
  }, [roomCode]);

  const fetchRoomInfo = async (code: string) => {
    setFetchingRoom(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/${code}`);
      if (res.ok) {
        const data = await res.json();
        setRoomData(data.room);
        setTakenTeams(data.room.teams.map((t: { id: string }) => t.id));
      } else {
        setRoomData(null);
        setTakenTeams([]);
      }
    } catch {
      // API not available, will attempt on join
      setRoomData(null);
    } finally {
      setFetchingRoom(false);
    }
  };

  const handleJoin = async () => {
    const code = roomCode.trim().toUpperCase();
    if (code.length !== 6) { toast.error('Enter a valid 6-character room code!'); return; }
    if (!selectedTeam) { toast.error('Select a team!'); return; }
    if (!managerName.trim()) { toast.error('Enter your manager name!'); return; }

    setLoading(true);
    try {
      const socket = initSocket(SERVER_URL);

      socket.emit('joinRoom', {
        roomCode: code,
        teamId: selectedTeam.id,
        managerName: managerName.trim(),
      });

      socket.once('roomJoined', () => {
        setMyTeamId(selectedTeam.id);
        setMyManagerName(managerName.trim());
        navigate(`/lobby/${code}`);
      });

      socket.once('error', (err: { message: string }) => {
        toast.error(err.message || 'Failed to join room');
        setLoading(false);
      });

      // Timeout fallback
      setTimeout(() => {
        if (loading) {
          toast.error('Connection timeout. Check room code and try again.');
          setLoading(false);
        }
      }, 8000);
    } catch {
      toast.error('Failed to join room');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy pt-20 pb-10 px-4">
      <div className="max-w-2xl mx-auto">
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
            <h1 className="text-3xl font-black text-white">JOIN AUCTION</h1>
            <p className="text-white/50 text-sm">Enter a room code to join an auction</p>
          </div>
        </motion.div>

        <div className="space-y-6">
          {/* Room Code Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <label className="label text-base font-bold">Room Code</label>
            <div className="relative">
              <input
                type="text"
                value={roomCode}
                onChange={e => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="XXXXXX"
                className="input-field text-4xl font-black text-center tracking-[0.5em] uppercase"
                maxLength={6}
              />
              {fetchingRoom && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader size={16} className="animate-spin text-white/40" />
                </div>
              )}
            </div>

            {/* Room status */}
            {roomData && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 p-3 rounded-xl bg-cricket-green/10 border border-cricket-green/30 flex items-center gap-2"
              >
                <span className="text-cricket-green text-lg">✓</span>
                <div>
                  <div className="text-cricket-green font-bold text-sm">Room Found!</div>
                  <div className="text-white/50 text-xs">
                    {roomData.teams.length} teams joined • Status: {roomData.status}
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Manager Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <label className="label">Your Manager Name</label>
            <input
              type="text"
              value={managerName}
              onChange={e => setManagerName(e.target.value)}
              placeholder="Enter your name..."
              className="input-field text-lg font-bold"
              maxLength={20}
            />
          </motion.div>

          {/* Team Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <h2 className="section-title mb-4">Choose Your Team</h2>
            {takenTeams.length > 0 && (
              <p className="text-white/40 text-xs mb-4">
                Grayed-out teams are already taken
              </p>
            )}
            <IPLTeamSelector
              selectedTeamId={selectedTeam?.id ?? null}
              disabledTeamIds={takenTeams}
              onSelect={setSelectedTeam}
            />
          </motion.div>

          {/* Join Button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={handleJoin}
            disabled={loading}
            className="btn-primary w-full text-xl py-4 flex items-center justify-center gap-3"
          >
            {loading ? (
              <><Loader size={22} className="animate-spin" /> Joining...</>
            ) : (
              '🔑 JOIN AUCTION'
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
