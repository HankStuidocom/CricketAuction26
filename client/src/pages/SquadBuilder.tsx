import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Crown, Star, CheckCircle, ShieldAlert, ArrowRight, UserCheck } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import PlayerCard from '../components/PlayerCard';
import { BoughtPlayer } from '../types';
import { formatPoints, getRoleLabel } from '../utils/formatting';

export default function SquadBuilder() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { room, socket, myTeamId } = useGameStore();

  const myTeam = room?.teams.find((t) => t.id === myTeamId);

  const [playingXI, setPlayingXI] = useState<string[]>([]);
  const [captainId, setCaptainId] = useState<string | null>(null);
  const [viceCaptainId, setViceCaptainId] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Auto-fill initial Playing XI if squad has <= 11 players
  useEffect(() => {
    const squadList = myTeam?.players || myTeam?.squad || [];
    if (myTeam && playingXI.length === 0) {
      const allIds = squadList.map((p) => p.id);
      const initialXI = allIds.slice(0, 11);
      setPlayingXI(initialXI);
      if (initialXI.length > 0) setCaptainId(initialXI[0]);
      if (initialXI.length > 1) setViceCaptainId(initialXI[1]);
    }
  }, [myTeam, playingXI.length]);

  // Navigate when status changes
  useEffect(() => {
    if (!room) return;
    const st = (room.status || '').toLowerCase();
    if (st === 'simulation' || st === 'simulating') {
      navigate(`/simulation/${room.code}`);
    } else if (st === 'results') {
      navigate(`/results/${room.code}`);
    }
  }, [room?.status, room?.code, navigate]);

  if (!room || !myTeam) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Loading Squad...</h2>
          <p className="text-white/50 text-sm">Room: {roomCode}</p>
        </div>
      </div>
    );
  }

  const squad = myTeam.players || myTeam.squad || [];

  const togglePlayerXI = (player: BoughtPlayer) => {
    if (isLocked) return;
    if (playingXI.includes(player.id)) {
      setPlayingXI((prev) => prev.filter((id) => id !== player.id));
      if (captainId === player.id) setCaptainId(null);
      if (viceCaptainId === player.id) setViceCaptainId(null);
    } else {
      if (playingXI.length >= 11) {
        toast.error('Playing XI full! Max 11 players.');
        return;
      }
      setPlayingXI((prev) => [...prev, player.id]);
    }
  };

  const setCaptain = (playerId: string) => {
    if (isLocked) return;
    if (!playingXI.includes(playerId)) {
      toast.error('Must be in Playing XI to be Captain');
      return;
    }
    if (viceCaptainId === playerId) setViceCaptainId(null);
    setCaptainId(playerId);
    toast.success('Captain assigned! (1.5x multiplier)');
  };

  const setViceCaptain = (playerId: string) => {
    if (isLocked) return;
    if (!playingXI.includes(playerId)) {
      toast.error('Must be in Playing XI to be Vice Captain');
      return;
    }
    if (captainId === playerId) {
      toast.error('Captain cannot also be Vice Captain');
      return;
    }
    setViceCaptainId(playerId);
    toast.success('Vice Captain assigned! (1.25x multiplier)');
  };

  const countRoleInXI = (role: string) => {
    return squad.filter((p) => playingXI.includes(p.id) && p.role === role).length;
  };

  const batCount = countRoleInXI('BAT');
  const wkCount = countRoleInXI('WK');
  const arCount = countRoleInXI('AR');
  const bowlCount = countRoleInXI('BOWL');

  const isValidXI =
    playingXI.length === Math.min(11, squad.length) &&
    captainId !== null &&
    (squad.length < 2 || viceCaptainId !== null);

  const handleLockSquad = () => {
    if (!socket || !isValidXI) return;

    socket.emit('lockSquad', {
      roomCode: room.code,
      playingXI,
      captain: captainId,
      viceCaptain: viceCaptainId,
    });

    setIsLocked(true);
    toast.success('Squad locked! Waiting for other teams...');
  };

  return (
    <div className="min-h-screen py-8 px-4 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-card/60 p-6 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
        <div>
          <span className="text-gold text-xs font-bold uppercase tracking-wider">PHASE 2: SQUAD BUILDER</span>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            Select Playing XI & Captains
          </h1>
          <p className="text-white/60 text-xs mt-1">
            Pick your 11 best players. Captain gets <span className="text-gold font-bold">1.5x</span> points, Vice Captain gets <span className="text-gold font-bold">1.25x</span>.
          </p>
        </div>

        <button
          disabled={!isValidXI || isLocked}
          onClick={handleLockSquad}
          className={`btn ${
            isLocked
              ? 'bg-green-500/20 text-green-400 border border-green-500/40 cursor-default'
              : isValidXI
              ? 'bg-gold hover:bg-gold-light text-navy font-black shadow-lg shadow-gold/20'
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          } px-6 py-3 text-sm flex items-center gap-2`}
        >
          {isLocked ? (
            <>
              <CheckCircle size={18} /> SQUAD LOCKED
            </>
          ) : (
            <>
              <UserCheck size={18} /> CONFIRM PLAYING XI
            </>
          )}
        </button>
      </div>

      {/* Role Counts Indicator */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card p-3 rounded-xl border border-white/10 text-center">
          <div className="text-white/50 text-xs">BATTERS</div>
          <div className="text-lg font-bold text-white mt-0.5">{batCount} selected</div>
        </div>
        <div className="bg-card p-3 rounded-xl border border-white/10 text-center">
          <div className="text-white/50 text-xs">WICKETKEEPERS</div>
          <div className="text-lg font-bold text-white mt-0.5">{wkCount} selected</div>
        </div>
        <div className="bg-card p-3 rounded-xl border border-white/10 text-center">
          <div className="text-white/50 text-xs">ALL-ROUNDERS</div>
          <div className="text-lg font-bold text-white mt-0.5">{arCount} selected</div>
        </div>
        <div className="bg-card p-3 rounded-xl border border-white/10 text-center">
          <div className="text-white/50 text-xs">BOWLERS</div>
          <div className="text-lg font-bold text-white mt-0.5">{bowlCount} selected</div>
        </div>
      </div>

      {/* Main Squad Grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-3">
          YOUR PURCHASED SQUAD ({squad.length} Players) — Click card to toggle XI
        </h2>

        {squad.length === 0 ? (
          <div className="bg-card p-8 rounded-2xl text-center border border-white/10">
            <p className="text-white/50 text-sm">You did not purchase any players during the auction.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {squad.map((player) => {
              const inXI = playingXI.includes(player.id);
              const isC = captainId === player.id;
              const isVC = viceCaptainId === player.id;

              return (
                <div key={player.id} className="relative group">
                  <PlayerCard
                    player={player}
                    variant="squad"
                    isSelected={inXI}
                    isCaptain={isC}
                    isViceCaptain={isVC}
                    showBoughtPrice
                    onClick={() => togglePlayerXI(player)}
                  />

                  {/* Captain Action Overlay buttons */}
                  {inXI && !isLocked && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setCaptain(player.id)}
                        className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold border transition ${
                          isC
                            ? 'bg-gold text-navy border-gold'
                            : 'bg-card/80 text-white/70 border-white/20 hover:border-gold hover:text-gold'
                        }`}
                      >
                        👑 {isC ? 'Captain' : 'Set C'}
                      </button>
                      <button
                        onClick={() => setViceCaptain(player.id)}
                        className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold border transition ${
                          isVC
                            ? 'bg-white text-navy border-white'
                            : 'bg-card/80 text-white/70 border-white/20 hover:border-white hover:text-white'
                        }`}
                      >
                        ⭐ {isVC ? 'Vice Capt' : 'Set VC'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Waiting Status if locked */}
      {isLocked && (
        <div className="bg-green-500/10 border border-green-500/30 p-6 rounded-2xl text-center">
          <h3 className="text-lg font-bold text-green-400 mb-1">Squad Submitted Successfully!</h3>
          <p className="text-white/60 text-xs">Waiting for all other teams to complete squad selection...</p>
        </div>
      )}
    </div>
  );
}
