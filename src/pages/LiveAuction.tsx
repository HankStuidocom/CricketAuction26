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
import { AlertCircle, LogOut, Eye, ArrowLeft, Megaphone } from 'lucide-react';
import { sounds } from '../utils/sound';
import CommissionerControlRoom from '../components/CommissionerControlRoom';
import { ServerHealthBadge } from '../components/ServerHealthBadge';

export default function LiveAuction() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const isSpectator = location.state?.spectator === true || searchParams.get('spectate') === 'true' || searchParams.get('mode') === 'spectator';

  const savedSession = getRoomSession(code || '');
  const myFranchise = location.state?.franchise || savedSession.franchise || 'CSK';
  const myDisplayName = location.state?.displayName || savedSession.displayName || (isSpectator ? 'Spectator' : 'Player');
  const myUserId = location.state?.userId || savedSession.userId || getOrCreateUserId();

  const isManager = location.state?.manager === true || myFranchise === 'ADMIN';
  const { 
    roomState, 
    error, 
    connected, 
    chatMessages, 
    announcements,
    currentFranchise,
    isKicked,
    placeBid, 
    hostAction, 
    deferCurrentPlayer,
    relistUnsoldPlayer, 
    sendAnnouncement,
    sendChat, 
    kickPlayer, 
    updateAuctionSettings,
    hostEndAuction
  } = useAuction(code || '', myFranchise, myUserId, isSpectator, isManager);

  const activeFranchise = currentFranchise || myFranchise;

  // Redirect if kicked by host/commissioner
  useEffect(() => {
    if (isKicked) {
      const timer = setTimeout(() => navigate('/'), 3000);
      return () => clearTimeout(timer);
    }
  }, [isKicked, navigate]);

  const [timeLeft, setTimeLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<'teams' | 'chat' | 'manager'>('teams');
  const [chatInput, setChatInput] = useState('');
  const [activePlayerDetails, setActivePlayerDetails] = useState<any>(null);
  const [managerTimer, setManagerTimer] = useState(10);
  const [managerUnlimited, setManagerUnlimited] = useState(false);

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
  const isHighestBidder = currentBidder === activeFranchise;
  const isPaused = roomState?.status === 'PAUSED';
  const isHost = roomState?.host_id === myUserId;

  useEffect(() => {
    if (roomState) {
      setManagerTimer(roomState.bid_timer_seconds || 10);
      setManagerUnlimited(Boolean(roomState.is_unlimited_timer));
    }
  }, [roomState?.bid_timer_seconds, roomState?.is_unlimited_timer]);

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
    sendChat(chatInput, `${myDisplayName} (${activeFranchise})`);
    setChatInput('');
  };

  const myParticipant = roomState?.participants?.find((p: any) => p.franchise_id === activeFranchise);
  const myTeamData = FRANCHISE_MAP[activeFranchise] || ALL_FRANCHISES[0];

  const currentSquadCount = myParticipant?.squad_count || 0;
  const maxSquad = roomState?.max_squad_size || 10;
  const isSquadFull = currentSquadCount >= maxSquad;

  const osCount = myParticipant?.squad?.filter((s: any) => s.status === 'OS').length || 0;
  const isOverseasPlayer = activePlayerDetails?.status === 'OS';
  const isOSLimitReached = isOverseasPlayer && osCount >= 4;

  const minBasePrice = 50; // ₹0.5 Cr
  const minRoster = (roomState as any)?.min_squad_size || Math.min(5, maxSquad);
  const slotsRemainingAfterThis = Math.max(0, minRoster - currentSquadCount - 1);
  const requiredReserve = slotsRemainingAfterThis * minBasePrice;
  const myPurse = myParticipant?.purse_remaining_lakhs || 0;
  const isInsufficientPurse = (myPurse - nextBidAmount) < requiredReserve;

  let bidDisabledReason = '';
  if (isPaused) {
    bidDisabledReason = 'AUCTION PAUSED BY COMMISSIONER';
  } else if (!activePlayerDetails) {
    bidDisabledReason = 'WAITING FOR NEXT LOT...';
  } else if (isHighestBidder) {
    bidDisabledReason = 'YOU HOLD THE HIGHEST BID';
  } else if (isSquadFull) {
    bidDisabledReason = `SQUAD FULL (${currentSquadCount}/${maxSquad} ROSTER CAP)`;
  } else if (isOSLimitReached) {
    bidDisabledReason = `MAX OVERSEAS REACHED (4/4 OS CAP)`;
  } else if (isInsufficientPurse) {
    bidDisabledReason = `INSUFFICIENT PURSE (Need min ${formatCr(requiredReserve + nextBidAmount)})`;
  }

  const canPlaceBid = !bidDisabledReason && !isSpectator && !isManager;

  // Dedicated Commissioner Layout for Game Manager
  if (isManager) {
    return (
      <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] p-4 sm:p-6 font-['Inter',sans-serif] relative overflow-x-hidden">
        {/* Stadium Spotlight Background Mesh */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto w-full relative z-10">
          <CommissionerControlRoom
            code={code || ''}
            roomState={roomState}
            myUserId={myUserId}
            myDisplayName={myDisplayName}
            timeLeft={timeLeft}
            isPaused={isPaused}
            activePlayerDetails={activePlayerDetails}
            currentBid={currentBid}
            currentBidder={currentBidder}
            hostAction={hostAction}
            deferCurrentPlayer={deferCurrentPlayer}
            relistUnsoldPlayer={relistUnsoldPlayer}
            sendAnnouncement={sendAnnouncement}
            kickPlayer={kickPlayer}
            updateAuctionSettings={updateAuctionSettings}
            announcements={announcements}
            chatMessages={chatMessages}
            sendChat={sendChat}
            hostEndAuction={hostEndAuction}
            onNavigateResults={() => navigate(`/room/${code}/results`)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] flex flex-col lg:flex-row font-['Inter',sans-serif] relative overflow-x-hidden">
      
      {/* Stadium Spotlight Background Mesh */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#06B6D4]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Auction Stage (Left / Center) */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 justify-between max-w-4xl mx-auto w-full relative z-10">
        
        {/* Top Auction Header HUD */}
        <div className="flex justify-between items-center bg-[#111827] border border-[#1F2937] px-4 py-3 rounded-[6px] mb-4 backdrop-blur-xl shadow-lg">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${isSpectator ? 'bg-[#06B6D4]' : 'bg-[#10B981]'} animate-ping`}></span>
            <div>
              <div className="text-[10px] font-bold text-[#86948A] uppercase tracking-wider font-mono flex items-center gap-2">
                <span>ARENA #{code}</span>
                {isSpectator && (
                  <span className="px-1.5 py-0.2 rounded-[2px] bg-[#06B6D4]/20 text-[#06B6D4] text-[9px] font-bold font-mono tracking-wider">
                    SPECTATOR
                  </span>
                )}
              </div>
              <div className="font-['Outfit'] font-bold text-sm sm:text-base flex items-center gap-2">
                {isSpectator ? (
                  <span className="text-[#06B6D4] flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
                    <Eye size={14} className="text-[#06B6D4]" /> Live Spectator Stream
                  </span>
                ) : isManager ? (
                  <>
                    <CrownHostIcon size={17} color="#F59E0B" />
                    <span className="text-[#FFB95F]">GAME MANAGER</span>
                    <span className="text-[#86948A]/40">|</span>
                    <span className="text-xs font-bold text-[#86948A]">{myDisplayName}</span>
                  </>
                ) : (
                  <>
                    {myTeamData.logoUrl ? (
                      <img src={myTeamData.logoUrl} alt={myFranchise} className="w-5 h-5 object-contain drop-shadow" />
                    ) : (
                      <span>{myTeamData.emoji}</span>
                    )}
                    <span style={{ color: myTeamData.primary }}>{myFranchise}</span>
                    <span className="text-[#86948A]/40">|</span>
                    <span className="text-xs font-bold text-[#86948A]">{myDisplayName}</span>
                    {isHost && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-[2px] bg-[#F59E0B]/15 text-[#FFB95F] text-[10px] font-mono font-bold">
                        <CrownHostIcon size={11} color="#FFB95F" /> HOST
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Timer Readout & Spectator Exit */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ServerHealthBadge compact />
            {isSpectator && (
              <button
                onClick={() => navigate('/')}
                className="px-2.5 py-1.5 rounded-[4px] bg-[#0F131C] border border-[#1F2937] hover:border-[#EF4444] text-[#86948A] hover:text-[#FFB4AB] text-xs font-mono font-bold flex items-center gap-1 transition"
                title="Exit Spectator Mode"
              >
                <ArrowLeft size={13} />
                <span className="hidden sm:inline">EXIT</span>
              </button>
            )}

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

        {/* Official Commissioner Bulletin Banner */}
        {announcements && announcements.length > 0 && (
          <div className="mb-4 p-3 rounded-[6px] bg-[#F59E0B]/15 border border-[#F59E0B]/50 flex items-center gap-2.5 shadow-lg">
            <Megaphone size={16} className="text-[#FFB95F] flex-shrink-0 animate-bounce" />
            <div className="flex-1">
              <span className="text-[9px] font-mono font-bold text-[#FFB95F] uppercase tracking-wider block">
                COMMISSIONER OFFICIAL BULLETIN
              </span>
              <span className="text-xs font-bold text-white">
                {announcements[0]?.message}
              </span>
            </div>
          </div>
        )}

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
          {isSpectator ? (
            <div className="w-full py-3.5 px-6 rounded-[6px] bg-[#111827] border border-[#06B6D4]/40 text-center shadow-lg">
              <span className="font-['Outfit'] font-bold text-sm text-[#06B6D4] flex items-center justify-center gap-2 uppercase tracking-wide">
                <Eye size={16} /> SPECTATOR BROADCAST MODE
              </span>
              <span className="text-[10px] text-[#86948A] font-mono mt-0.5 block">
                Live stream only · Bidding controls disabled for spectators
              </span>
            </div>
          ) : isHighestBidder ? (
            <div className="w-full py-3.5 px-6 rounded-[6px] bg-[#1A2234] border border-[#10B981] text-center shadow-lg">
              <span className="font-['Outfit'] font-bold text-sm text-[#10B981] flex items-center justify-center gap-2 uppercase tracking-wide">
                <CheckmarkIcon size={16} color="#10B981" />
                YOU HOLD THE HIGHEST BID ({formatCr(currentBid)})
              </span>
              <span className="text-[10px] text-[#86948A] font-mono mt-0.5 block">
                Waiting for rival franchise counters
              </span>
            </div>
          ) : bidDisabledReason ? (
            <div className="w-full py-3.5 px-5 rounded-[6px] bg-[#181B25] border border-[#EF4444]/40 text-center shadow-inner">
              <span className="font-['Outfit'] font-bold text-xs sm:text-sm text-[#FFB4AB] flex items-center justify-center gap-2 uppercase tracking-wide">
                <AlertCircle size={15} className="text-[#EF4444]" />
                {bidDisabledReason}
              </span>
              <span className="text-[10px] text-[#86948A] font-mono mt-0.5 block">
                Tournament rules require squad reserve & overseas limits
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <GameButton
                onClick={handlePlaceBid}
                disabled={!canPlaceBid}
                variant="primary"
                size="xl"
                fullWidth
                className="py-4 shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                icon={<GavelIcon size={20} color="#090D16" />}
              >
                BID {formatCr(nextBidAmount)}
              </GameButton>

              {/* Quick-Bid Jump Options */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '+25 Lakh', add: 25 },
                  { label: '+50 Lakh', add: 50 },
                  { label: '+1 Crore', add: 100 },
                ].map((qb) => {
                  const baseLotPrice = activePlayerDetails?.base_price_lakhs || 50;
                  const currentBaseline = currentBid === 0 ? baseLotPrice : currentBid;
                  const targetBid = currentBaseline + qb.add;
                  const canQuickBid = (myPurse - targetBid) >= requiredReserve && targetBid > currentBid && !isHighestBidder && !isPaused && !isSquadFull && !isOSLimitReached && !isSpectator && !isManager;
                  return (
                    <button
                      key={qb.label}
                      type="button"
                      disabled={!canQuickBid}
                      onClick={() => {
                        sounds.playBid();
                        placeBid(targetBid);
                      }}
                      className="py-1.5 px-2 rounded-[4px] bg-[#111827] hover:bg-[#1C1F29] border border-[#1F2937] hover:border-[#10B981]/50 text-center text-xs font-mono font-bold text-[#10B981] disabled:opacity-40 transition active:scale-95 cursor-pointer"
                    >
                      {qb.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* My Purse HUD Strip (Only if participant) */}
          {!isSpectator && !isManager && myParticipant && (
            <div className="mt-3 p-3 bg-[#111827] border border-[#1F2937] rounded-[6px] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[4px] bg-[#10B981]/15 flex items-center justify-center">
                  <PurseCoinsIcon size={14} color="#10B981" />
                </div>
                <div>
                  <span className="text-[11px] text-[#86948A] font-mono uppercase font-bold block">Remaining Purse</span>
                  <span className="font-mono font-bold text-sm text-[#DFE2EF]">
                    {formatCr(myParticipant.purse_remaining_lakhs)}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-[#86948A] font-mono uppercase font-bold block">Squad Slots</span>
                <span className="font-mono font-bold text-xs text-[#10B981]">
                  {myParticipant.squad_count || 0} / {roomState?.max_squad_size || 10} Players
                </span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Side Console / Team Deck (Desktop Right / Mobile Bottom) */}
      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-[#1F2937] bg-[#0F131C] p-4 flex flex-col justify-between">
        <div>
          {/* Host Control Deck - Visible only to host (never for spectators) */}
          {!isSpectator && isHost && (
            <div className="mb-5 p-3.5 bg-[#111827] border border-[#1F2937] rounded-[6px]">
              <div className="text-[10px] font-mono font-bold text-[#86948A] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CrownHostIcon size={12} color="#F59E0B" />
                AUCTIONEER COMMAND DECK
              </div>

              <div className="grid grid-cols-5 gap-2">
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
                  onClick={() => hostAction('relist_current')}
                  className="p-2 bg-[#0F131C] hover:bg-[#1A2234] rounded-[4px] text-[10px] font-bold font-['Outfit'] flex flex-col items-center gap-1 border border-[#06B6D4]/40 text-[#8BE9FD] transition active:scale-95"
                  title="Move this player to the final upcoming round"
                >
                  <FastForwardIcon size={14} color="#06B6D4" />
                  <span>Relist</span>
                </button>

                <button
                  onClick={() => hostEndAuction()}
                  className="p-2 bg-[#0F131C] hover:bg-[#1A2234] rounded-[4px] text-[10px] font-bold font-['Outfit'] flex flex-col items-center gap-1 border border-[#F59E0B]/40 text-[#FFB95F] transition active:scale-95"
                  title="Conclude auction and mint rosters"
                >
                  <TrophyCupIcon size={14} color="#F59E0B" />
                  <span>Results</span>
                </button>
              </div>
              {isManager && (
                <div className="mt-3 pt-3 border-t border-[#1F2937] flex items-center gap-2">
                  <input type="number" min="5" max="120" value={managerTimer} onChange={(e) => setManagerTimer(Number(e.target.value))} disabled={managerUnlimited} className="w-16 bg-[#0F131C] border border-[#1F2937] rounded-[4px] px-2 py-1.5 text-xs font-mono text-[#DFE2EF]" />
                  <label className="flex items-center gap-1.5 text-[10px] font-mono text-[#86948A]"><input type="checkbox" checked={managerUnlimited} onChange={(e) => setManagerUnlimited(e.target.checked)} /> Unlimited</label>
                  <button onClick={() => updateAuctionSettings(managerTimer, managerUnlimited)} className="ml-auto text-[10px] font-mono font-bold text-[#10B981] hover:text-[#6FFBBE]">APPLY TIMER</button>
                </div>
              )}
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
            {(isHost || isManager) && (
              <button
                onClick={() => setActiveTab('manager')}
                className={`pb-2 px-3 border-b-2 uppercase tracking-wider transition flex items-center gap-1.5 ${
                  activeTab === 'manager' ? 'border-[#F59E0B] text-[#FFB95F]' : 'border-transparent text-[#86948A] hover:text-[#FFB95F]'
                }`}
              >
                <CrownHostIcon size={12} color={activeTab === 'manager' ? '#FFB95F' : '#86948A'} />
                Manager Deck
              </button>
            )}
          </div>

          {/* TAB 3: Manager Deck & Queue Inspector */}
          {activeTab === 'manager' && (
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1 text-xs">
              {/* Queue status breakdown */}
              <div className="p-3 bg-[#111827] border border-[#1F2937] rounded-[6px]">
                <div className="text-[10px] font-mono font-bold uppercase text-[#86948A] mb-2 flex items-center justify-between">
                  <span>AUCTION LOT BREAKDOWN</span>
                  <span className="text-[#FFB95F] font-bold">MANAGER AUTHORITY</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center font-mono">
                  <div className="p-1.5 rounded-[4px] bg-[#0F131C] border border-[#1F2937]">
                    <div className="text-sm font-bold text-[#10B981]">
                      {roomState?.queue_summary?.find((q: any) => q.status === 'PENDING')?.count || 0}
                    </div>
                    <div className="text-[8px] text-[#86948A]">UPCOMING</div>
                  </div>
                  <div className="p-1.5 rounded-[4px] bg-[#0F131C] border border-[#1F2937]">
                    <div className="text-sm font-bold text-[#06B6D4]">
                      {roomState?.queue_summary?.find((q: any) => q.status === 'RELISTED')?.count || 0}
                    </div>
                    <div className="text-[8px] text-[#86948A]">RELISTED</div>
                  </div>
                  <div className="p-1.5 rounded-[4px] bg-[#0F131C] border border-[#1F2937]">
                    <div className="text-sm font-bold text-[#FFB4AB]">
                      {roomState?.unsold_list?.length || roomState?.queue_summary?.find((q: any) => q.status === 'UNSOLD')?.count || 0}
                    </div>
                    <div className="text-[8px] text-[#86948A]">UNSOLD</div>
                  </div>
                  <div className="p-1.5 rounded-[4px] bg-[#0F131C] border border-[#1F2937]">
                    <div className="text-sm font-bold text-[#F59E0B]">
                      {roomState?.sold_list?.length || 0}
                    </div>
                    <div className="text-[8px] text-[#86948A]">SOLD</div>
                  </div>
                </div>
              </div>

              {/* Unsold Category */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-['Outfit'] font-bold text-[11px] uppercase tracking-wider text-[#FFB4AB] flex items-center gap-1.5">
                    <CloseIcon size={12} color="#FFB4AB" /> Unsold Players Pool ({roomState?.unsold_list?.length || 0})
                  </span>
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                  {(!roomState?.unsold_list || roomState.unsold_list.length === 0) ? (
                    <div className="p-2.5 bg-[#0F131C] border border-[#1F2937] rounded-[4px] text-center text-[#86948A] italic text-[11px]">
                      No unsold players yet.
                    </div>
                  ) : (
                    roomState.unsold_list.map((pl: any) => (
                      <div key={pl.player_id} className="p-2 rounded-[4px] bg-[#111827] border border-[#1F2937] flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white text-xs">{pl.player_name}</div>
                          <div className="text-[10px] text-[#86948A] font-mono">
                            {pl.primary_role} · {pl.country} · {formatCr(pl.base_price_lakhs)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => relistUnsoldPlayer(pl.player_id)}
                          className="px-2 py-1 rounded-[3px] bg-[#06B6D4]/15 border border-[#06B6D4]/40 hover:bg-[#06B6D4]/30 text-[#8BE9FD] text-[10px] font-mono font-bold transition"
                          title="Move player to final upcoming round"
                        >
                          + UPCOMING
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Upcoming players preview */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-['Outfit'] font-bold text-[11px] uppercase tracking-wider text-[#86948A]">
                    Next In Line (Preview)
                  </span>
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto font-mono text-[11px]">
                  {(!roomState?.upcoming_list || roomState.upcoming_list.length === 0) ? (
                    <div className="p-2.5 bg-[#0F131C] border border-[#1F2937] rounded-[4px] text-center text-[#86948A] italic">
                      Queue finished or loading...
                    </div>
                  ) : (
                    roomState.upcoming_list.slice(0, 5).map((u: any, idx: number) => (
                      <div key={u.player_id} className="p-1.5 rounded-[4px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-between">
                        <span className="text-[#86948A]">#{idx + 1} {u.player_name}</span>
                        <span className={u.status === 'RELISTED' ? 'text-[#06B6D4] font-bold' : 'text-[#10B981]'}>
                          {u.status === 'RELISTED' ? 'RELIST' : formatCr(u.base_price_lakhs)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

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

                    <div className="text-right flex items-center gap-2">
                      {isManager && participant && !participant.is_ai && !participant.is_host && (
                        <button
                          onClick={() => kickPlayer(participant.user_id)}
                          className="px-1.5 py-1 rounded-[3px] text-[9px] font-mono font-bold text-[#FFB4AB] border border-[#EF4444]/40 hover:bg-[#EF4444]/10"
                          title={`Hand ${f.id} to an AI bot`}
                        >
                          KICK
                        </button>
                      )}
                      <div>
                        <div className="font-mono text-xs font-bold text-[#10B981]">
                          {formatCr(participant?.purse_remaining_lakhs ?? roomState?.starting_purse_lakhs ?? 12000)}
                        </div>
                        <div className="text-[9px] text-[#86948A] uppercase font-mono font-medium">Purse</div>
                      </div>
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
