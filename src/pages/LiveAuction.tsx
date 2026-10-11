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
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] flex flex-col md:flex-row font-['Inter',sans-serif] relative overflow-x-hidden">
      
      {/* Stadium Spotlight Background Mesh */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Auction Stage (Left / Center) */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 justify-between max-w-4xl mx-auto w-full relative z-10">
        
        {/* Top Auction Header HUD */}
        <div className="flex justify-between items-center bg-[#111827] border border-[#1F2937] px-4 py-3 rounded-[6px] mb-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping"></span>
            <div>
              <div className="text-[10px] font-bold text-[#86948A] uppercase tracking-wider font-mono">
                ARENA #{code}
              </div>
              <div className="font-['Outfit'] font-bold text-sm sm:text-base flex items-center gap-2">
                {myTeamData.logoUrl ? (
                  <img src={myTeamData.logoUrl} alt={myFranchise} className="w-5 h-5 object-contain drop-shadow" />
                ) : (
                  <span>{myTeamData.emoji}</span>
                )}
                <span style={{ color: myTeamData.primary }}>{myFranchise}</span>
                <span className="text-[#86948A]/40">|</span>
                <span className="text-xs font-bold text-[#86948A]">{myDisplayName}</span>
                {isHost && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-[2px] bg-[#F59E0B]/15 text-[#FFB95F] text-[8px] font-mono font-bold">
                    <CrownHostIcon size={10} color="#FFB95F" /> HOST
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Timer Readout */}
          <div className="flex items-center gap-3">
            {isPaused ? (
              <span className="px-3 py-1 bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-xs rounded-[4px] uppercase tracking-wider font-['Outfit']">
                PAUSED
              </span>
            ) : (
              <div className="flex items-center gap-2 bg-[#0F131C] px-3 py-1.5 rounded-[4px] border border-[#1F2937]">
                <TimerGaugeIcon 
                  size={16} 
                  color={timeLeft <= 3 && timeLeft > 0 ? '#EF4444' : '#10B981'} 
                />
                <span className="text-[10px] text-[#86948A] font-mono font-bold uppercase">
                  TIME
                </span>
                <span className={`text-xl font-mono font-bold ${
                  timeLeft <= 3 && timeLeft > 0 
                    ? 'text-[#EF4444] animate-pulse drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]' 
                    : 'text-[#10B981]'
                }`}>
                  {timeLeft > 0 ? `00:${timeLeft < 10 ? '0' : ''}${timeLeft}` : '--'}
                </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-[4px] text-xs font-bold flex items-center gap-2">
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
              <div className="mt-3 p-3 rounded-[6px] bg-[#111827] border border-[#1F2937] flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[4px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-center p-1">
                    {FRANCHISE_MAP[currentBidder]?.logoUrl ? (
                      <img src={FRANCHISE_MAP[currentBidder].logoUrl} alt={currentBidder} className="max-h-full object-contain" />
                    ) : (
                      <span>{FRANCHISE_MAP[currentBidder]?.emoji || '🦁'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] text-[#86948A] font-mono font-bold uppercase tracking-widest block">
                      Leading Bidder
                    </span>
                    <span className="font-['Outfit'] font-bold text-xs text-[#DFE2EF]" style={{ color: FRANCHISE_MAP[currentBidder]?.primary }}>
                      {currentBidder} {isHighestBidder && '(YOU)'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-[#86948A] font-mono font-bold uppercase tracking-widest block">
                    Current Amount
                  </span>
                  <span className="font-mono font-bold text-lg text-[#10B981]">
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
            <div className="w-full py-3.5 px-6 rounded-[6px] bg-[#1A2234] border border-[#10B981] text-center shadow-lg">
              <span className="font-['Outfit'] font-bold text-sm text-[#10B981] flex items-center justify-center gap-2 uppercase tracking-wide">
                <CheckmarkIcon size={16} color="#10B981" />
                YOU HOLD THE HIGHEST BID ({formatCr(currentBid)})
              </span>
              <span className="text-[10px] text-[#86948A] font-mono mt-0.5 block">
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
              className="py-4 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
              icon={<GavelIcon size={20} color="#090D16" />}
            >
              BID {formatCr(nextBidAmount)}
            </GameButton>
          )}

          {/* My Purse HUD Strip */}
          {myParticipant && (
            <div className="mt-3 p-3 bg-[#111827] border border-[#1F2937] rounded-[6px] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[4px] bg-[#10B981]/15 flex items-center justify-center">
                  <PurseCoinsIcon size={14} color="#10B981" />
                </div>
                <div>
                  <span className="text-[9px] text-[#86948A] font-mono uppercase font-bold block">Remaining Purse</span>
                  <span className="font-mono font-bold text-sm text-[#DFE2EF]">
                    {formatCr(myParticipant.purse_remaining_lakhs)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] text-[#86948A] font-mono uppercase font-bold block">Squad Slots</span>
                <span className="font-mono font-bold text-xs text-[#10B981]">
                  {myParticipant.squad_count || 0} / {roomState?.max_squad_size || 10} Players
                </span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Side Console / Team Deck (Desktop Right / Mobile Bottom) */}
      <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-[#1F2937] bg-[#0F131C] p-4 flex flex-col justify-between">
        <div>
          {/* Host Control Deck - Visible only to host */}
          {isHost && (
            <div className="mb-5 p-3.5 bg-[#111827] border border-[#1F2937] rounded-[6px]">
              <div className="text-[10px] font-mono font-bold text-[#86948A] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CrownHostIcon size={12} color="#F59E0B" />
                AUCTIONEER COMMAND DECK
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => hostAction(isPaused ? 'resume' : 'pause')}
                  className="p-2 bg-[#0F131C] hover:bg-[#1A2234] rounded-[4px] text-[10px] font-bold font-['Outfit'] flex flex-col items-center gap-1 border border-[#1F2937] hover:border-[#10B981] text-[#DFE2EF] transition active:scale-95"
                >
                  {isPaused ? <PlayArrowIcon size={14} color="#10B981" /> : <PauseIcon size={14} color="#DFE2EF" />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>

                <button
                  onClick={() => hostAction('skip')}
                  className="p-2 bg-[#0F131C] hover:bg-[#1A2234] rounded-[4px] text-[10px] font-bold font-['Outfit'] flex flex-col items-center gap-1 border border-[#1F2937] hover:border-[#06B6D4] text-[#DFE2EF] transition active:scale-95"
                >
                  <FastForwardIcon size={14} color="#DFE2EF" />
                  <span>Skip</span>
                </button>

                <button
                  onClick={() => hostAction('mark_unsold')}
                  className="p-2 bg-[#0F131C] hover:bg-[#1A2234] rounded-[4px] text-[10px] font-bold font-['Outfit'] flex flex-col items-center gap-1 border border-[#EF4444]/40 text-[#FFB4AB] transition active:scale-95"
                >
                  <CloseIcon size={14} color="#EF4444" />
                  <span>Unsold</span>
                </button>

                <button
                  onClick={() => navigate(`/room/${code}/results`)}
                  className="p-2 bg-[#0F131C] hover:bg-[#1A2234] rounded-[4px] text-[10px] font-bold font-['Outfit'] flex flex-col items-center gap-1 border border-[#F59E0B]/40 text-[#FFB95F] transition active:scale-95"
                >
                  <TrophyCupIcon size={14} color="#F59E0B" />
                  <span>Results</span>
                </button>
              </div>
            </div>
          )}

          {/* Tabs for Right Panel */}
          <div className="flex border-b border-[#1F2937] mb-3 text-xs font-bold font-['Outfit']">
            <button
              onClick={() => setActiveTab('teams')}
              className={`pb-2 px-3 border-b-2 uppercase tracking-wider transition ${
                activeTab === 'teams' ? 'border-[#10B981] text-[#10B981]' : 'border-transparent text-[#86948A]'
              }`}
            >
              Teams & Purse
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`pb-2 px-3 border-b-2 uppercase tracking-wider transition ${
                activeTab === 'chat' ? 'border-[#10B981] text-[#10B981]' : 'border-transparent text-[#86948A]'
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
                    className={`p-2.5 rounded-[4px] border flex justify-between items-center transition ${
                      isMyTeam 
                        ? 'bg-[#1A2234] border-[#10B981]/50' 
                        : 'bg-[#111827] border-[#1F2937]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-[4px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-center p-1">
                        {f.logoUrl ? (
                          <img src={f.logoUrl} alt={f.id} className="max-h-full object-contain" />
                        ) : (
                          <span className="text-sm">{f.emoji}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-['Outfit'] font-bold text-xs" style={{ color: f.primary }}>
                          {f.name}
                        </div>
                        <div className="text-[10px] text-[#86948A] font-mono">
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
                      <div className="font-mono text-xs font-bold text-[#10B981]">
                        {formatCr(participant?.purse_remaining_lakhs ?? roomState?.starting_purse_lakhs ?? 12000)}
                      </div>
                      <div className="text-[9px] text-[#86948A] uppercase font-mono font-medium">Purse</div>
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
                  <div className="text-center py-8 text-[#86948A] text-xs italic font-mono">
                    No comms yet. Coordinate tactical bidding!
                  </div>
                ) : (
                  chatMessages.map((m, i) => (
                    <div key={i} className="p-2 bg-[#0F131C] rounded-[4px] border border-[#1F2937]">
                      <span className="font-bold text-[#10B981] font-['Outfit'] mr-1.5">{m.sender}:</span>
                      <span className="text-[#DFE2EF]">{m.message}</span>
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleSendChat} className="flex gap-2 mt-3 pt-2 border-t border-[#1F2937]">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Send tactical comm..."
                  className="flex-1 bg-[#0A0E17] border border-[#1F2937] rounded-[4px] px-3 py-2 text-xs text-[#DFE2EF] focus:outline-none focus:border-[#10B981] font-mono"
                />
                <GameButton type="submit" variant="primary" size="sm">
                  SEND
                </GameButton>
              </form>
            </div>
          )}
        </div>

        {/* Exit Room Strip */}
        <div className="pt-3 border-t border-[#1F2937] flex justify-between items-center text-xs text-[#86948A]">
          <span className="font-mono text-[10px]">TACTICAL PITCH ENGINE</span>
          <button 
            onClick={() => navigate('/')} 
            className="hover:text-[#DFE2EF] flex items-center gap-1.5 transition text-xs font-mono font-bold"
          >
            <LogOut size={13} /> Exit Arena
          </button>
        </div>
      </div>

    </div>
  );
}