import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuction } from '../hooks/useAuction';
import { 
  formatCr, 
  ALL_FRANCHISES, 
  FRANCHISE_MAP, 
  getNextBid, 
  getOrCreateUserId, 
  getRoomSession 
} from '../lib/utils';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import PlayerHeroCard from '../components/PlayerHeroCard';
import { 
  CricketBatBallIcon, 
  GavelIcon, 
  TimerGaugeIcon, 
  PurseCoinsIcon, 
  CrownHostIcon, 
  BotsAiIcon, 
  CheckmarkIcon, 
  TacticalChatIcon,
  PlayArrowIcon,
  PauseIcon,
  FastForwardIcon,
  CloseIcon,
  TrophyCupIcon
} from '../components/GameIcons';
import { AlertCircle, LogOut } from 'lucide-react';
import { sounds } from '../utils/sound';

export default function LiveAuction() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const savedSession = getRoomSession(code || '');
  const myFranchise = location.state?.franchise || savedSession.franchise || 'CSK';
  const myDisplayName = location.state?.displayName || savedSession.displayName || 'Player';
  const myUserId = location.state?.userId || savedSession.userId || getOrCreateUserId();

  const { roomState, error, connected, chatMessages, placeBid, hostAction, sendChat } = useAuction(code || '', myFranchise, myUserId);

  const [timeLeft, setTimeLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<'teams' | 'chat'>('teams');
  const [chatInput, setChatInput] = useState('');
  const [activePlayerDetails, setActivePlayerDetails] = useState<any>(null);

  // Sync deadline timer
  useEffect(() => {
    if (roomState?.bid_deadline) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((roomState.bid_deadline - Date.now()) / 1000));
        setTimeLeft(remaining);
        if (remaining <= 3 && remaining > 0) {
          sounds.playTick();
        }
      }, 200);
      return () => clearInterval(interval);
    } else {
      setTimeLeft(0);
    }
  }, [roomState?.bid_deadline]);

  // Use current_player from roomState
  useEffect(() => {
    if (roomState?.current_player) {
      setActivePlayerDetails(roomState.current_player);
    }
  }, [roomState?.current_player]);

  // Redirect on completion
  useEffect(() => {
    if (roomState?.status === 'COMPLETED') {
      navigate(`/room/${code}/results`);
    }
  }, [roomState?.status, code]);

  const currentBid = roomState?.current_bid_lakhs || 0;
  const currentBidder = roomState?.current_bidder_franchise;
  const isHighestBidder = currentBidder === myFranchise;
  const isPaused = roomState?.status === 'PAUSED';
  const isHost = roomState?.host_id === myUserId;

  // Calculate next bid
  const nextBidAmount = currentBid === 0 
    ? (activePlayerDetails?.base_price_lakhs || 50)
    : getNextBid(currentBid);

  const handlePlaceBid = () => {
    sounds.playBid();
    placeBid(nextBidAmount);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChat(chatInput, `${myDisplayName} (${myFranchise})`);
    setChatInput('');
  };

  const myParticipant = roomState?.participants?.find((p: any) => p.franchise_id === myFranchise);
  const myTeamData = FRANCHISE_MAP[myFranchise] || ALL_FRANCHISES[0];

  return (
    <div className="min-h-screen bg-[#020814] text-[#F8FAFC] flex flex-col md:flex-row font-['DM_Sans',sans-serif] relative overflow-x-hidden">
      
      {/* Stadium Spotlight Background Mesh */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#1769FF]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#D9FF4D]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Auction Stage (Left / Center) */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 justify-between max-w-4xl mx-auto w-full relative z-10">
        
        {/* Top Auction Header HUD */}
        <div className="flex justify-between items-center bg-[#061124]/90 border border-white/10 px-4 py-3 rounded-2xl mb-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D9FF4D] animate-ping"></span>
            <div>
              <div className="text-[10px] font-black text-[#8993A8] uppercase tracking-wider font-mono">
                ARENA #{code}
              </div>
              <div className="font-['Manrope'] font-black text-sm sm:text-base flex items-center gap-2">
                {myTeamData.logoUrl ? (
                  <img src={myTeamData.logoUrl} alt={myFranchise} className="w-5 h-5 object-contain drop-shadow" />
                ) : (
                  <span>{myTeamData.emoji}</span>
                )}
                <span style={{ color: myTeamData.primary }}>{myFranchise}</span>
                <span className="text-white/30">|</span>
                <span className="text-xs font-bold text-[#8993A8]">{myDisplayName}</span>
                {isHost && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[8px] font-black">
                    <CrownHostIcon size={10} color="#FBBF24" /> HOST
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Timer Readout */}
          <div className="flex items-center gap-3">
            {isPaused ? (
              <span className="px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-300 font-black text-xs rounded-full uppercase tracking-wider font-['Manrope']">
                PAUSED
              </span>
            ) : (
              <div className="flex items-center gap-2 bg-[#020814]/80 px-3 py-1.5 rounded-xl border border-white/10">
                <TimerGaugeIcon 
                  size={16} 
                  color={timeLeft <= 3 && timeLeft > 0 ? '#FF3366' : '#D9FF4D'} 
                />
                <span className="text-[10px] text-[#8993A8] font-bold font-['Manrope'] uppercase">
                  TIME
                </span>
                <span className={`text-xl font-mono font-black ${
                  timeLeft <= 3 && timeLeft > 0 
                    ? 'text-[#FF3366] animate-pulse drop-shadow-[0_0_12px_rgba(255,51,102,0.8)]' 
                    : 'text-[#D9FF4D]'
                }`}>
                  {timeLeft > 0 ? `00:${timeLeft < 10 ? '0' : ''}${timeLeft}` : '--'}
                </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Player Card Showcase (The Centerpiece of Live Auction) */}
        <div className="my-auto py-2 flex flex-col items-center">
          <div className="w-full max-w-md">
            <PlayerHeroCard
              player={activePlayerDetails}
              statusText={
                currentBidder 
                  ? `${currentBidder} AT ${formatCr(currentBid)}` 
                  : (activePlayerDetails ? 'ACCEPTING BIDS' : 'WAITING...')
              }
            />

            {/* Current Leading Bid Strip */}
            {currentBid > 0 && currentBidder && (
              <div className="mt-3 p-3 rounded-2xl bg-gradient-to-r from-[#0E2042] via-[#09152E] to-[#040C1A] border border-white/15 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1">
                    {FRANCHISE_MAP[currentBidder]?.logoUrl ? (
                      <img src={FRANCHISE_MAP[currentBidder].logoUrl} alt={currentBidder} className="max-h-full object-contain" />
                    ) : (
                      <span>{FRANCHISE_MAP[currentBidder]?.emoji || '🦁'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] text-[#8993A8] font-extrabold uppercase tracking-widest block">
                      Leading Bidder
                    </span>
                    <span className="font-['Manrope'] font-black text-xs text-white" style={{ color: FRANCHISE_MAP[currentBidder]?.primary }}>
                      {currentBidder} {isHighestBidder && '(YOU)'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-[#8993A8] font-extrabold uppercase tracking-widest block">
                    Current Amount
                  </span>
                  <span className="font-['Manrope'] font-black text-lg text-[#D9FF4D] font-mono">
                    {formatCr(currentBid)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Thumb-Friendly Tactile Bid Action Section */}
        <div className="mt-auto pt-4 max-w-md mx-auto w-full">
          {isHighestBidder ? (
            <div className="w-full py-4 px-6 rounded-2xl bg-[#091B3A] border-2 border-[#D9FF4D]/40 text-center shadow-lg">
              <span className="font-['Manrope'] font-black text-sm text-[#D9FF4D] flex items-center justify-center gap-2 uppercase tracking-wide">
                <CheckmarkIcon size={16} color="#D9FF4D" />
                YOU HOLD THE HIGHEST BID ({formatCr(currentBid)})
              </span>
              <span className="text-[10px] text-[#8993A8] mt-0.5 block">
                Waiting for rivals to counter-bid
              </span>
            </div>
          ) : (
            <GameButton
              onClick={handlePlaceBid}
              disabled={isPaused || !activePlayerDetails}
              variant="primary"
              size="xl"
              fullWidth
              className="py-5 shadow-[0_0_35px_rgba(217,255,77,0.45)]"
              icon={<GavelIcon size={22} color="#051120" />}
            >
              BID {formatCr(nextBidAmount)}
            </GameButton>
          )}

          {/* My Purse HUD Strip */}
          {myParticipant && (
            <div className="mt-3 p-3 bg-[#061124] border border-white/10 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#D9FF4D]/15 flex items-center justify-center">
                  <PurseCoinsIcon size={14} color="#D9FF4D" />
                </div>
                <div>
                  <span className="text-[9px] text-[#8993A8] uppercase font-bold block">Remaining Purse</span>
                  <span className="font-mono font-black text-sm text-white">
                    {formatCr(myParticipant.purse_remaining_lakhs)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] text-[#8993A8] uppercase font-bold block">Squad Slots</span>
                <span className="font-bold text-xs text-[#D9FF4D]">
                  {myParticipant.squad_count || 0} / {roomState?.max_squad_size || 10} Players
                </span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Side Console / Team Deck (Desktop Right / Mobile Bottom) */}
      <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-white/10 bg-[#061124]/95 backdrop-blur-xl p-4 flex flex-col justify-between">
        <div>
          {/* Host Control Deck - Visible only to host */}
          {isHost && (
            <div className="mb-5 p-3.5 bg-[#030914] border border-white/10 rounded-2xl">
              <div className="text-[10px] font-black text-[#8993A8] uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-['Manrope']">
                <CrownHostIcon size={12} color="#FBBF24" />
                AUCTIONEER COMMAND DECK
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => hostAction(isPaused ? 'resume' : 'pause')}
                  className="p-2 bg-[#09152B] hover:bg-[#0E2042] rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border border-white/10 text-white transition active:scale-95"
                >
                  {isPaused ? <PlayArrowIcon size={14} color="#D9FF4D" /> : <PauseIcon size={14} color="#FFFFFF" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>

                <button
                  onClick={() => hostAction('skip')}
                  className="p-2 bg-[#09152B] hover:bg-[#0E2042] rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border border-white/10 text-white transition active:scale-95"
                >
                  <FastForwardIcon size={14} color="#FFFFFF" />
                  <span>Skip</span>
                </button>

                <button
                  onClick={() => hostAction('mark_unsold')}
                  className="p-2 bg-[#09152B] hover:bg-[#0E2042] rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border border-red-500/30 text-red-400 transition active:scale-95"
                >
                  <CloseIcon size={14} color="#FF3366" />
                  <span>Unsold</span>
                </button>

                <button
                  onClick={() => navigate(`/room/${code}/results`)}
                  className="p-2 bg-[#09152B] hover:bg-[#0E2042] rounded-xl text-[10px] font-black flex flex-col items-center gap-1 border border-amber-500/30 text-amber-400 transition active:scale-95"
                >
                  <TrophyCupIcon size={14} color="#FFB800" />
                  <span>Results</span>
                </button>
              </div>
            </div>
          )}

          {/* Tabs for Right Panel */}
          <div className="flex border-b border-white/10 mb-3 text-xs font-bold font-['Manrope']">
            <button
              onClick={() => setActiveTab('teams')}
              className={`pb-2 px-3 border-b-2 uppercase tracking-wider transition ${
                activeTab === 'teams' ? 'border-[#D9FF4D] text-[#D9FF4D]' : 'border-transparent text-[#8993A8]'
              }`}
            >
              Teams & Purse
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`pb-2 px-3 border-b-2 uppercase tracking-wider transition ${
                activeTab === 'chat' ? 'border-[#00E5FF] text-[#00E5FF]' : 'border-transparent text-[#8993A8]'
              }`}
            >
              Arena Comms
            </button>
          </div>

          {/* TAB 1: Teams Overview */}
          {activeTab === 'teams' && (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {ALL_FRANCHISES.map(f => {
                const participant = roomState?.participants?.find((p: any) => p.franchise_id === f.id);
                const isMyTeam = participant?.franchise_id === myFranchise;
                
                return (
                  <div 
                    key={f.id} 
                    className={`p-2.5 rounded-xl border flex justify-between items-center transition ${
                      isMyTeam 
                        ? 'bg-[#0E2042] border-[#D9FF4D]/40' 
                        : 'bg-[#040C1A] border-white/8'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center p-1">
                        {f.logoUrl ? (
                          <img src={f.logoUrl} alt={f.id} className="max-h-full object-contain" />
                        ) : (
                          <span className="text-sm">{f.emoji}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-['Manrope'] font-black text-xs" style={{ color: f.primary }}>
                          {f.name}
                        </div>
                        <div className="text-[10px] text-[#8993A8]">
                          {participant ? (
                            <>
                              <span>{participant.is_ai ? '🤖 Bot' : participant.display_name}</span>
                              <span className="text-white/40"> · </span>
                              <span>{participant.squad_count || 0}/{roomState?.max_squad_size || 10}</span>
                            </>
                          ) : 'Open Slot'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-xs font-black text-[#D9FF4D]">
                        {formatCr(participant?.purse_remaining_lakhs ?? roomState?.starting_purse_lakhs ?? 12000)}
                      </div>
                      <div className="text-[9px] text-[#8993A8] uppercase font-bold">Purse</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Live Chat */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[360px]">
              <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-[#8993A8] text-xs italic">
                    No comms yet. Taunt your opponents!
                  </div>
                ) : (
                  chatMessages.map((m, i) => (
                    <div key={i} className="p-2 bg-[#040C1A] rounded-xl border border-white/5">
                      <span className="font-black text-[#D9FF4D] font-['Manrope'] mr-1.5">{m.sender}:</span>
                      <span className="text-white">{m.message}</span>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSendChat} className="flex gap-2 mt-3 pt-2 border-t border-white/8">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send tactical comm..."
                  className="flex-1 bg-[#030914] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#00E5FF]"
                />
                <GameButton type="submit" variant="cyan" size="sm">
                  SEND
                </GameButton>
              </form>
            </div>
          )}
        </div>

        {/* Exit Room Strip */}
        <div className="pt-3 border-t border-white/8 flex justify-between items-center text-xs text-[#8993A8]">
          <span className="font-mono text-[10px]">CRICKAUCTION ENGINE</span>
          <button 
            onClick={() => navigate('/')} 
            className="hover:text-white flex items-center gap-1.5 transition text-xs font-bold"
          >
            <LogOut size={13} /> Exit Arena
          </button>
        </div>
      </div>

    </div>
  );
}