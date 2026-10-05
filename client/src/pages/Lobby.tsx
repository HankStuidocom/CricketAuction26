import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Copy, Check, Users, Play, Wifi } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useSocket } from '../hooks/useSocket';
import { GameTeam } from '../types';
import { IPL_TEAMS, SERVER_URL } from '../utils/constants';
import clsx from 'clsx';

function TeamSlot({ team, isMe, isHost }: { team?: GameTeam; isMe?: boolean; isHost?: boolean }) {
  if (!team) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/5">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
          <motion.div
            className="w-2 h-2 rounded-full bg-white/30"
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        </div>
        <span className="text-white/30 text-sm italic">Waiting for player...</span>
      </div>
    );
  }

  const iplTeam = IPL_TEAMS.find(t => t.id === team.iplTeamId || t.id === team.id);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={clsx(
        'flex items-center gap-3 p-3 rounded-xl border-2 transition-all',
        isMe
          ? 'border-cricket-green/50 bg-cricket-green/10'
          : team.isAI
          ? 'border-purple-500/30 bg-purple-500/5'
          : 'border-white/20 bg-white/5'
      )}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-black text-xs text-white shrink-0"
        style={{
          background: iplTeam
            ? `linear-gradient(135deg, ${iplTeam.color}, ${iplTeam.secondaryColor})`
            : '#374151',
        }}
      >
        {iplTeam?.abbr ?? '?'}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">{iplTeam?.name ?? team.id}</span>
          {isMe && <span className="badge bg-cricket-green/20 text-cricket-green border border-cricket-green/40 text-[10px]">YOU</span>}
          {isHost && <span className="badge bg-gold/20 text-gold border border-gold/40 text-[10px]">HOST</span>}
          {team.isAI && <span className="badge bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px]">AI</span>}
        </div>
        <div className="text-white/50 text-xs">{team.isAI ? 'AI Manager' : team.managerName}</div>
      </div>
      {team.isReady && !team.isAI && (
        <div className="flex items-center gap-1 text-cricket-green text-xs font-bold">
          <Check size={12} /> Ready
        </div>
      )}
    </motion.div>
  );
}

export default function Lobby() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { room, myTeamId, socket, setRoom } = useGameStore();
  const { isConnected } = useSocket();

  const [copied, setCopied] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const myTeam = room?.teams.find(t => t.id === myTeamId || t.id === socket?.id);
  const isHost = Boolean(
    (socket?.id && room?.hostId && socket.id === room.hostId) ||
    (myTeamId && room?.hostId && myTeamId === room.hostId) ||
    (room?.teams?.length && (room.teams[0].id === myTeamId || room.teams[0].id === socket?.id))
  );
  const allReadyOrAI = room?.teams.every(t => t.isReady || t.isAI) ?? false;

  // Sync socket channel & poll room state
  useEffect(() => {
    if (!roomCode) return;

    const fetchRoom = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/rooms/${roomCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.room) {
            setRoom(data.room);
          }
        }
      } catch {
        // silent
      }
    };

    fetchRoom();

    if (socket && isConnected) {
      socket.emit('joinRoom', { roomCode, teamId: myTeamId });
    }

    const interval = setInterval(fetchRoom, 1500);
    return () => clearInterval(interval);
  }, [roomCode, socket, isConnected, myTeamId, setRoom]);

  // Listen for auction start
  useEffect(() => {
    if (!socket) return;
    const onStart = () => navigate(`/auction/${roomCode}`);
    socket.on('auctionStarted', onStart);
    socket.on('auction:playerShown', onStart);
    return () => {
      socket.off('auctionStarted', onStart);
      socket.off('auction:playerShown', onStart);
    };
  }, [socket, navigate, roomCode]);

  // Redirect if auction already running
  useEffect(() => {
    const st = (room?.status || '').toLowerCase();
    if (st === 'auction' || st === 'auction_active') {
      navigate(`/auction/${roomCode}`);
    }
  }, [room?.status, navigate, roomCode]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode ?? '');
    setCopied(true);
    toast.success('Room code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join?code=${roomCode}`);
    toast.success('Invite link copied!');
  };

  const handleReady = () => {
    if (!socket || !room) return;
    const newReady = !isReady;
    setIsReady(newReady);
    socket.emit('setReady', { roomCode: room.code, isReady: newReady });
  };

  const handleStart = () => {
    if (!socket || !room) return;
    socket.emit('startAuction', { roomCode: room.code });
  };

  // Build all 10 team slots
  const allSlots = IPL_TEAMS.map(iplTeam => room?.teams.find(t => t.iplTeamId === iplTeam.id || t.id === iplTeam.id));

  return (
    <div className="min-h-screen bg-navy pt-20 pb-10 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="text-white/50 text-sm uppercase tracking-wider mb-2">Auction Lobby</div>
          <h1 className="text-4xl font-black text-white mb-6">WAITING FOR PLAYERS</h1>

          {/* Room code display */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="bg-card border-2 border-gold/30 rounded-2xl px-8 py-4">
              <div className="text-white/40 text-xs mb-1 uppercase tracking-wider">Room Code</div>
              <div className="font-mono font-black text-gold text-4xl tracking-[0.3em]">
                {roomCode}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={copyCode}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all"
              >
                {copied ? <Check size={14} className="text-cricket-green" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
              <button
                onClick={copyLink}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all"
              >
                <Wifi size={14} />
                Share Link
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Team slots — takes 2 cols */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <Users size={16} className="text-gold" />
                  Players ({room?.teams.filter(t => !t.isAI).length ?? 0} / 10)
                </h2>
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="flex items-center gap-1.5 text-xs text-cricket-green"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-cricket-green" />
                  Live
                </motion.div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allSlots.map((team, idx) => (
                  <TeamSlot
                    key={IPL_TEAMS[idx].id}
                    team={team}
                    isMe={team?.id === myTeamId}
                    isHost={team && socket?.id === room?.hostId && team.id === myTeamId}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* My status */}
            <div className="card">
              <h3 className="font-bold text-white mb-3 text-sm">Your Status</h3>
              {myTeam ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center font-black text-white text-sm"
                      style={{
                        background: (() => {
                          const t = IPL_TEAMS.find(t => t.id === myTeam.id);
                          return `linear-gradient(135deg, ${t?.color}, ${t?.secondaryColor})`;
                        })(),
                      }}
                    >
                      {IPL_TEAMS.find(t => t.id === myTeam.id)?.abbr}
                    </div>
                    <div>
                      <div className="font-bold text-white">{myTeam.managerName}</div>
                      <div className="text-white/50 text-xs">{IPL_TEAMS.find(t => t.id === myTeam.id)?.name}</div>
                    </div>
                  </div>
                  {isHost ? (
                    <div className="badge bg-gold/20 text-gold border border-gold/40 text-xs w-full justify-center py-2">
                      👑 You are the HOST
                    </div>
                  ) : (
                    <button
                      onClick={handleReady}
                      className={clsx(
                        'w-full py-2 rounded-xl border-2 font-bold text-sm transition-all',
                        isReady
                          ? 'border-cricket-green bg-cricket-green/20 text-cricket-green'
                          : 'border-white/20 text-white/60 hover:border-white/40'
                      )}
                    >
                      {isReady ? '✓ Ready!' : 'Set Ready'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-white/50 text-sm">Joining...</div>
              )}
            </div>

            {/* Room Settings */}
            {room && (
              <div className="card">
                <h3 className="font-bold text-white mb-3 text-sm">Room Settings</h3>
                <div className="space-y-2 text-sm">
                  {[
                    ['Purse', `₹${room.settings.startingPurse}L`],
                    ['Timer', `${room.settings.bidTimerSeconds}s`],
                    ['Pool', room.settings.playerPool],
                    ['AI Teams', room.settings.aiTeams ? room.settings.aiDifficulty : 'OFF'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span className="text-white/50">{k}</span>
                      <span className="font-bold text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Start button — host only */}
            <AnimatePresence>
              {isHost && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <button
                    onClick={handleStart}
                    disabled={!isConnected}
                    className="btn-primary w-full flex items-center justify-center gap-2 text-lg py-4"
                    style={{
                      boxShadow: '0 0 25px rgba(245,166,35,0.4)',
                    }}
                  >
                    <Play size={20} />
                    START AUCTION
                  </button>
                  <p className="text-white/30 text-xs text-center mt-2">
                    {allReadyOrAI ? 'All teams ready! Good to go.' : 'You can start anytime as host.'}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!isHost && (
              <div className="card text-center">
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-white/50 text-sm"
                >
                  Waiting for host to start...
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
