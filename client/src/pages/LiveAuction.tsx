import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Play, Pause, SkipForward, ArrowRight, Trophy, ShieldAlert } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { useAuction } from '../hooks/useAuction';
import PlayerCard from '../components/PlayerCard';
import AuctionTimer from '../components/AuctionTimer';
import BidPanel from '../components/BidPanel';
import TeamCard from '../components/TeamCard';
import SoldOverlay from '../components/SoldOverlay';
import { SERVER_URL, IPL_TEAMS } from '../utils/constants';

export default function LiveAuction() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { room, socket, myTeamId, initSocket, isConnected, setRoom, setAuctionState } = useGameStore();
  const { auctionState, myTeam, canBid, placeBid } = useAuction();
  const [isPaused, setIsPaused] = useState(false);

  // Initialize socket connection & fetch room state on mount
  useEffect(() => {
    if (!isConnected) {
      initSocket(SERVER_URL);
    }
  }, [isConnected, initSocket]);

  // Fetch room & auction state
  useEffect(() => {
    if (!roomCode) return;

    const fetchAuctionRoom = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/api/rooms/${roomCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.room) {
            setRoom(data.room);
            if (data.room.currentAuction) {
              setAuctionState({
                currentPlayer: data.room.currentAuction.currentPlayer,
                currentBid: data.room.currentAuction.currentBid,
                currentBidderId: data.room.currentAuction.currentBidderId,
                currentBidderName: null,
                phase: data.room.currentAuction.isPaused ? 'WAITING' : 'BIDDING',
                timeRemaining: data.room.currentAuction.timerSeconds ?? 15,
                soldPlayers: data.room.currentAuction.soldPlayers ?? [],
                unsoldPlayers: data.room.currentAuction.unsoldPlayers ?? [],
                playerIndex: 0,
                totalPlayers: data.room.playerPool?.length ?? 60,
                lastBidTimestamp: Date.now(),
              });
            }
          }
        }
      } catch {
        // silent
      }
    };

    fetchAuctionRoom();

    if (socket && isConnected) {
      socket.emit('joinRoom', { roomCode, teamId: myTeamId });
    }

    const interval = setInterval(fetchAuctionRoom, 2000);
    return () => clearInterval(interval);
  }, [roomCode, socket, isConnected, myTeamId, setRoom, setAuctionState]);

  // Navigate when room status changes
  useEffect(() => {
    if (!room) return;
    const st = (room.status || '').toLowerCase();
    if (st === 'squad' || st === 'squad_building') {
      toast.success('Auction completed! Moving to Squad Selection.');
      navigate(`/squad/${room.code}`);
    } else if (st === 'simulation' || st === 'simulating') {
      navigate(`/simulation/${room.code}`);
    } else if (st === 'results') {
      navigate(`/results/${room.code}`);
    }
  }, [room?.status, room?.code, navigate]);

  const isHost = Boolean(
    (socket?.id && room?.hostId && socket.id === room.hostId) ||
    (myTeamId && room?.hostId && myTeamId === room.hostId) ||
    (room?.teams?.length && (room.teams[0].id === myTeamId || room.teams[0].id === socket?.id))
  );

  const handlePauseResume = () => {
    if (!socket || !room) return;
    if (isPaused) {
      socket.emit('resumeAuction', { roomCode: room.code });
      setIsPaused(false);
      toast.success('Auction Resumed');
    } else {
      socket.emit('pauseAuction', { roomCode: room.code });
      setIsPaused(true);
      toast('Auction Paused', { icon: '⏸️' });
    }
  };

  const handleSkipPlayer = () => {
    if (!socket || !room) return;
    socket.emit('skipPlayer', { roomCode: room.code });
    toast('Skipped player', { icon: '⏭️' });
  };

  if (!room || !auctionState) {
    return (
      <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Connecting to Auction...</h2>
        <p className="text-white/50 text-sm">Room Code: {roomCode}</p>
      </div>
    );
  }

  const currentPlayer = auctionState.currentPlayer;
  const currentBidder = room.teams.find((t) => t.id === auctionState.currentBidderId);
  const currentBidderIplTeam = currentBidder
    ? currentBidder.iplTeam ||
      IPL_TEAMS.find((t) => t.id === currentBidder.iplTeamId) ||
      IPL_TEAMS.find((t) => t.id === currentBidder.id) ||
      IPL_TEAMS[0]
    : null;

  return (
    <div className="min-h-screen pb-12 pt-4 px-4 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-card/60 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
        <div>
          <span className="text-gold text-xs font-bold uppercase tracking-wider">LIVE AUCTION</span>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            ROOM: <span className="text-gold font-mono">{room.code}</span>
          </h1>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-white/50 text-xs">PLAYERS SOLD</div>
            <div className="text-white font-bold text-sm">
              {auctionState.soldPlayers.length} / {auctionState.totalPlayers || room.playerPool.length}
            </div>
          </div>

          {isHost && (
            <div className="flex items-center gap-2">
              <button
                onClick={handlePauseResume}
                className="btn bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 flex items-center gap-1.5"
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
                {isPaused ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={handleSkipPlayer}
                className="btn bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 flex items-center gap-1.5"
              >
                <SkipForward size={14} /> Skip
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: 3 columns on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Current Player Card (5 cols) */}
        <div className="lg:col-span-4">
          {currentPlayer ? (
            <PlayerCard player={currentPlayer} variant="auction" />
          ) : (
            <div className="bg-card p-8 rounded-2xl border border-white/10 text-center">
              <Trophy size={48} className="mx-auto text-gold/40 mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-white mb-2">Preparing Next Player...</h3>
              <p className="text-white/50 text-xs">Get your bids ready!</p>
            </div>
          )}
        </div>

        {/* CENTER: Bidding Center (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Current Bid Display */}
          <div className="bg-card p-6 rounded-2xl border-2 border-white/10 flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-gold/10 to-transparent pointer-events-none" />

            <div className="text-white/50 text-xs font-bold tracking-widest uppercase mb-1">
              CURRENT HIGHEST BID
            </div>

            <motion.div
              key={auctionState.currentBid}
              initial={{ scale: 1.2, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-5xl font-black text-gold font-mono tracking-tight my-2"
            >
              ₹{auctionState.currentBid}L
            </motion.div>

            {/* Current Bidder info */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-white/60 text-xs">BIDDER:</span>
              {currentBidder && currentBidderIplTeam ? (
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold text-navy"
                  style={{ backgroundColor: currentBidderIplTeam.color || '#F5A623' }}
                >
                  {currentBidderIplTeam.abbr} ({currentBidder.managerName})
                </span>
              ) : (
                <span className="text-white/40 text-xs italic">No bids yet</span>
              )}
            </div>

            {/* Countdown Timer */}
            <div className="mt-6">
              <AuctionTimer
                timeRemaining={auctionState.timeRemaining}
                totalTime={room.settings?.auctionTimer || room.settings?.bidTimerSeconds || 10}
                isActive={auctionState.phase === 'BIDDING' || auctionState.phase === 'PLAYER_UP'}
              />
            </div>

            {/* Status indicator */}
            <div className="mt-4">
              {auctionState.phase === 'GOING_ONCE' && (
                <span className="badge bg-amber-500/20 text-amber-300 border border-amber-500/40 px-4 py-1 text-xs font-bold animate-pulse">
                  🔨 GOING ONCE...
                </span>
              )}
              {auctionState.phase === 'GOING_TWICE' && (
                <span className="badge bg-orange-500/20 text-orange-300 border border-orange-500/40 px-4 py-1 text-xs font-bold animate-pulse">
                  🔨 GOING TWICE...
                </span>
              )}
              {auctionState.phase === 'SOLD' && (
                <span className="badge bg-green-500/20 text-green-400 border border-green-500/40 px-4 py-1 text-xs font-bold">
                  💥 SOLD!
                </span>
              )}
              {auctionState.phase === 'UNSOLD' && (
                <span className="badge bg-red-500/20 text-red-400 border border-red-500/40 px-4 py-1 text-xs font-bold">
                  ❌ UNSOLD
                </span>
              )}
            </div>
          </div>

          {/* Bid Control Buttons */}
          <BidPanel
            canBid={canBid}
            currentBid={auctionState.currentBid}
            myPurse={myTeam?.purse || 0}
            isWinning={auctionState.currentBidderId === myTeamId}
            isAuctionActive={auctionState.phase === 'BIDDING' || auctionState.phase === 'PLAYER_UP'}
            onBid={placeBid}
          />
        </div>

        {/* RIGHT: Teams Sidebar (3 cols) */}
        <div className="lg:col-span-3 space-y-3 max-h-[80vh] overflow-y-auto pr-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white/50 px-1">
            TEAMS PURSE ({room.teams.length})
          </h3>
          {room.teams.map((t) => (
            <TeamCard
              key={t.id}
              team={t}
              isCurrentBidder={auctionState.currentBidderId === t.id}
              isMyTeam={t.id === myTeamId}
            />
          ))}
        </div>
      </div>

      {/* Full screen Sold Overlay notification */}
      <AnimatePresence>
        {auctionState.phase === 'SOLD' && currentPlayer && currentBidder && currentBidderIplTeam && (
          <SoldOverlay
            soldRecord={{
              player: currentPlayer,
              teamId: currentBidder.id,
              teamName: currentBidderIplTeam.name,
              price: auctionState.currentBid,
              timestamp: Date.now(),
            }}
            onComplete={() => {}}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
