import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuction } from '../hooks/useAuction';
import { formatCr, ALL_FRANCHISES, FRANCHISE_MAP, ROLE_COLORS, ROLE_SHORT, getNextBid, getOrCreateUserId, getRoomSession } from '../lib/utils';
import { 
  Pause, Play, SkipForward, X, Gavel, Undo2, LogOut, 
  Users, ChevronUp, ChevronDown, MessageSquare, AlertCircle, 
  Flame, Award, Shield, Sparkles, Crown, UserCheck
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'info' | 'teams' | 'chat'>('teams');
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

  // Use current_player from roomState (already enriched)
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

  const teamColor = FRANCHISE_MAP[myFranchise]?.primary || '#B6FF3B';

  // Get my participant data from roomState
  const myParticipant = roomState?.participants?.find((p: any) => p.franchise_id === myFranchise);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05172E] via-[#020B18] to-[#020A16] text-[#F5F7FF] flex flex-col md:flex-row font-['DM_Sans',sans-serif]">
      {/* Main Auction Stage (Left / Center) */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 justify-between max-w-4xl mx-auto w-full">
        {/* Top Auction Header */}
        <div className="flex justify-between items-center bg-[#0B1730] border border-white/10 px-4 py-3 rounded-2xl mb-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#D9FF4D] animate-pulse"></span>
            <div>
              <div className="text-xs font-bold text-[#8993A8] uppercase tracking-wider font-mono">ROOM #{code}</div>
              <div className="font-extrabold text-sm sm:text-base flex items-center gap-1.5 font-['Manrope']">
                {FRANCHISE_MAP[myFranchise]?.logoUrl && (
                  <img src={FRANCHISE_MAP[myFranchise].logoUrl} alt={myFranchise} className="w-5 h-5 object-contain drop-shadow" />
                )}
                <span>{myFranchise}</span>
                <span className="text-[#8993A8]">·</span>
                <span className="text-xs font-medium text-[#8993A8]">{myDisplayName}</span>
                {isHost && <Crown size={14} className="text-[#F5C542]" />}
                {myParticipant?.is_ai && <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 text-[9px] font-bold rounded">AI</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {isPaused ? (
              <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-400 font-extrabold text-xs rounded-full">
                PAUSED
              </span>
            ) : (
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-xs text-[#8993A8]">TIMER:</span>
                <span className={`text-xl font-black ${timeLeft <= 3 && timeLeft > 0 ? 'text-red-500 animate-pulse' : 'text-[#D9FF4D]'}`}>
                  {timeLeft > 0 ? `00:${timeLeft < 10 ? '0' : ''}${timeLeft}` : '--'}
                </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Player Card Showcase (The Heart of the Game) */}
        <div className="my-auto py-4 flex flex-col items-center">
          {activePlayerDetails ? (
            <div 
              className="w-full max-w-md bg-[#0B1730] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-300"
              style={{ borderTop: `6px solid ${ROLE_COLORS[activePlayerDetails.primary_role] || '#D9FF4D'}` }}
            >
              {/* Badges strip */}
              <div className="flex justify-between items-center mb-6">
                <span 
                  className="px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase text-black"
                  style={{ backgroundColor: ROLE_COLORS[activePlayerDetails.primary_role] || '#B6FF3B' }}
                >
                  {activePlayerDetails.primary_role}
                </span>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                    activePlayerDetails.status === 'OS' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {activePlayerDetails.status === 'OS' ? 'OVERSEAS' : 'INDIA'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#F5C542]/20 text-[#F5C542] border border-[#F5C542]/30 flex items-center gap-1">
                    <Sparkles size={12} /> {activePlayerDetails.game_points} PTS
                  </span>
                </div>
              </div>

              {/* Player Name and Country */}
              <div className="text-center my-6">
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">
                  {activePlayerDetails.player_name}
                </h2>
                <div className="text-sm text-[#A3A7B0] flex items-center justify-center gap-2">
                  <span>{activePlayerDetails.country}</span>
                  {activePlayerDetails.franchise_2026 && (
                    <>
                      <span>·</span>
                      <span className="font-bold text-[#F5F5F5]">{activePlayerDetails.franchise_2026}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Base Price and Current Bid Highlight */}
              <div className="grid grid-cols-2 gap-3 pt-6 border-t border-[rgba(255,255,255,0.08)]">
                <div className="bg-[#181B21] p-3 rounded-xl text-center">
                  <div className="text-[10px] text-[#A3A7B0] font-bold uppercase tracking-wider">BASE PRICE</div>
                  <div className="text-base font-extrabold mt-0.5">{formatCr(activePlayerDetails.base_price_lakhs)}</div>
                </div>

                <div className="bg-[#181B21] p-3 rounded-xl text-center border border-[rgba(255,255,255,0.08)]">
                  <div className="text-[10px] text-[#A3A7B0] font-bold uppercase tracking-wider">CURRENT BID</div>
                  <div className="text-base font-black text-[#B6FF3B] mt-0.5">
                    {currentBid > 0 ? formatCr(currentBid) : 'None'}
                  </div>
                </div>
              </div>

              {currentBidder && (
                <div className="mt-3 py-2 px-3 bg-[#181B21] rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2 text-[#F5F5F5]">
                  <span>Highest Bidder:</span>
                  {FRANCHISE_MAP[currentBidder]?.logoUrl && (
                    <img src={FRANCHISE_MAP[currentBidder].logoUrl} alt={currentBidder} className="w-5 h-5 object-contain drop-shadow" />
                  )}
                  <span className="text-[#B6FF3B] font-black">{currentBidder}</span>
                  {currentBidder === myFranchise && (
                    <UserCheck size={14} className="text-[#B6FF3B]" />
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-md bg-[#0B1730] border border-white/10 rounded-3xl p-12 text-center">
              <div className="animate-spin text-[#D9FF4D] inline-block mb-4 text-2xl">🏏</div>
              <h3 className="text-xl font-extrabold font-['Manrope'] text-white">Waiting for Next Player...</h3>
              <p className="text-xs text-[#8993A8] mt-1">The auctioneer will call the next cricketer to the stage.</p>
            </div>
          )}
        </div>

        {/* Action Button Section (Thumb-friendly Bottom Zone) */}
        <div className="mt-auto pt-4 max-w-md mx-auto w-full">
          <button
            onClick={handlePlaceBid}
            disabled={isHighestBidder || isPaused || !activePlayerDetails}
            className={`w-full py-5 px-6 rounded-2xl font-black text-lg sm:text-xl tracking-tight transition shadow-2xl flex flex-col items-center justify-center font-['Manrope'] ${
              isHighestBidder
                ? 'bg-[#061224] text-[#8993A8] border border-white/10 cursor-not-allowed'
                : isPaused
                ? 'bg-[#061224] text-[#8993A8] cursor-not-allowed'
                : 'bg-[#D9FF4D] hover:bg-[#c7f035] text-[#07111E] shadow-[0_0_30px_rgba(217,255,77,0.35)] active:scale-95'
            }`}
          >
            <span>{isHighestBidder ? 'YOU ARE HIGHEST BIDDER' : `BID ${formatCr(nextBidAmount)}`}</span>
            {!isHighestBidder && (
              <span className="text-[11px] font-extrabold opacity-75 uppercase tracking-wider">
                Click to raise bid
              </span>
            )}
          </button>
          
          {/* My Purse Display */}
          {myParticipant && (
            <div className="mt-3 p-3 bg-[#061224] border border-white/10 rounded-xl text-center">
              <div className="text-[10px] text-[#8993A8] font-bold uppercase tracking-wider">YOUR PURSE</div>
              <div className="text-lg font-black text-[#D9FF4D] font-mono mt-1">{formatCr(myParticipant.purse_remaining_lakhs)}</div>
              <div className="text-[10px] text-[#8993A8] mt-1">Squad: {myParticipant.squad_count || 0} / {roomState?.max_squad_size || 10}</div>
            </div>
          )}
        </div>
      </div>

      {/* Side Management Deck (Desktop / Mobile Tabs) */}
      <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-white/10 bg-[#0B1730] p-4 flex flex-col justify-between">
        <div>
          {/* Host Control Deck - Only visible to host */}
          {isHost && (
            <div className="mb-6">
              <div className="text-xs font-bold text-[#8993A8] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Gavel size={14} /> AUCTIONEER COMMANDS
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => hostAction(isPaused ? 'resume' : 'pause')}
                  className="p-2.5 bg-[#061224] hover:bg-[#122247] rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-white/10 text-white"
                >
                  {isPaused ? <Play size={16} className="text-[#D9FF4D]" /> : <Pause size={16} />}
                  <span>{isPaused ? 'Resume' : 'Pause'}</span>
                </button>

                <button
                  onClick={() => hostAction('skip')}
                  className="p-2.5 bg-[#061224] hover:bg-[#122247] rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-white/10 text-white"
                >
                  <SkipForward size={16} />
                  <span>Skip</span>
                </button>

                <button
                  onClick={() => hostAction('mark_unsold')}
                  className="p-2.5 bg-[#061224] hover:bg-[#122247] rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-white/10 text-red-400"
                >
                  <X size={16} />
                  <span>Unsold</span>
                </button>

                <button
                  onClick={() => navigate(`/room/${code}/results`)}
                  className="p-2.5 bg-[#061224] hover:bg-[#122247] rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-white/10 text-[#F5C542]"
                >
                  <Award size={16} />
                  <span>Results</span>
                </button>
              </div>
            </div>
          )}

          {!isHost && (
            <div className="mb-6 p-3 bg-[#061224] border border-white/10 rounded-xl text-center text-xs text-[#8993A8]">
              Host controls visible to auctioneer only
            </div>
          )}

          {/* Navigation Tabs for Right Panel */}
          <div className="flex border-b border-white/10 mb-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('teams')}
              className={`pb-2 px-3 border-b-2 transition ${activeTab === 'teams' ? 'border-[#D9FF4D] text-[#D9FF4D]' : 'border-transparent text-[#8993A8]'}`}
            >
              Teams & Purse
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`pb-2 px-3 border-b-2 transition ${activeTab === 'chat' ? 'border-[#B6FF3B] text-[#B6FF3B]' : 'border-transparent text-[#A3A7B0]'}`}
            >
              Live Chat
            </button>
          </div>

          {/* Tab 1: Teams Overview - Using real-time data from roomState */}
          {activeTab === 'teams' && (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {ALL_FRANCHISES.map(f => {
                const participant = roomState?.participants?.find((p: any) => p.franchise_id === f.id);
                const isMyTeam = participant?.franchise_id === myFranchise;
                
                return (
                  <div key={f.id} className={`p-3 bg-[#181B21] rounded-xl border flex justify-between items-center ${
                    isMyTeam ? 'border-[#B6FF3B]/30' : 'border-[rgba(255,255,255,0.04)]'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      {f.logoUrl ? (
                        <img src={f.logoUrl} alt={f.id} className="w-12 h-12 object-contain drop-shadow-sm" />
                      ) : (
                        <span className="text-base">{f.emoji}</span>
                      )}
                      <div>
                        <div className="font-extrabold text-xs" style={{ color: f.primary }}>{f.name}</div>
                        {participant && (
                          <>
                            <div className="text-[10px] text-[#A3A7B0]">
                              {participant.is_ai ? '🤖 AI' : '👤 Human'} · Squad: {participant.squad_count || 0} / {roomState?.max_squad_size || 10}
                            </div>
                            {participant.is_host && <div className="text-[10px] text-[#F5C542] font-bold">HOST</div>}
                          </>
                        )}
                        {!participant && (
                          <div className="text-[10px] text-[#A3A7B0]">Open Slot</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {participant ? (
                        <div className="font-mono text-xs font-bold text-[#B6FF3B]">
                          {formatCr(participant.purse_remaining_lakhs)}
                        </div>
                      ) : (
                        <div className="font-mono text-xs font-bold text-[#F5F5F5]">
                          {formatCr(roomState?.starting_purse_lakhs || 12000)}
                        </div>
                      )}
                      <div className="text-[10px] text-[#A3A7B0]">Purse</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab 2: Live Chat */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[380px]">
              <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-1">
                {chatMessages.map((m, i) => (
                  <div key={i} className="p-2 bg-[#181B21] rounded-lg">
                    <span className="font-bold text-[#B6FF3B] mr-1.5">{m.sender}:</span>
                    <span className="text-[#F5F5F5]">{m.message}</span>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendChat} className="flex gap-2 mt-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Chat with rivals..."
                  className="flex-1 bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#B6FF3B]"
                />
                <button type="submit" className="px-4 py-2 bg-[#B6FF3B] text-black font-bold text-xs rounded-xl">
                  Send
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Exit Room link */}
        <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] flex justify-between items-center text-xs text-[#A3A7B0]">
          <span>IPL 2026 Engine</span>
          <button onClick={() => navigate('/')} className="hover:text-[#F5F5F5] flex items-center gap-1">
            <LogOut size={14} /> Exit
          </button>
        </div>
      </div>
    </div>
  );
}