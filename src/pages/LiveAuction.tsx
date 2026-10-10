import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuction } from '../hooks/useAuction';
import { formatCr, ALL_FRANCHISES, FRANCHISE_MAP, ROLE_COLORS, ROLE_SHORT, getNextBid } from '../lib/utils';
import { safeFetch } from '../lib/api';
import { 
  Pause, Play, SkipForward, X, Gavel, Undo2, LogOut, 
  Users, ChevronUp, ChevronDown, MessageSquare, AlertCircle, 
  Flame, Award, Shield, Sparkles
} from 'lucide-react';
import { sounds } from '../utils/sound';

export default function LiveAuction() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const myFranchise = location.state?.franchise || 'CSK';
  const myDisplayName = location.state?.displayName || 'Player';

  const { roomState, error, connected, chatMessages, placeBid, hostAction, sendChat } = useAuction(code || '', myFranchise);

  const [timeLeft, setTimeLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<'info' | 'teams' | 'chat'>('teams');
  const [chatInput, setChatInput] = useState('');
  const [roomInfo, setRoomInfo] = useState<any>(null);
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

  // Load player details from backend when current_player_id changes
  useEffect(() => {
    if (roomState?.current_player_id) {
      safeFetch(`/api/admin/players/${roomState.current_player_id}`)
        .then(player => {
          if (player) setActivePlayerDetails(player);
        })
        .catch(() => {
          // Fallback if needed
          safeFetch('/api/admin/players')
            .then(players => {
              const found = Array.isArray(players) && players.find((p: any) => p.id === roomState.current_player_id);
              if (found) setActivePlayerDetails(found);
            })
            .catch(() => {});
        });
    }
  }, [roomState?.current_player_id]);

  // Load room details
  useEffect(() => {
    if (code) {
      safeFetch(`/api/rooms/${code}`)
        .then(data => setRoomInfo(data))
        .catch(() => {});
    }
  }, [code]);

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

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col md:flex-row pitch-bg">
      {/* Main Auction Stage (Left / Center) */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 justify-between max-w-4xl mx-auto w-full">
        {/* Top Auction Header */}
        <div className="flex justify-between items-center bg-[#111318] border border-[rgba(255,255,255,0.08)] px-4 py-3 rounded-2xl mb-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B6FF3B] animate-pulse"></span>
            <div>
              <div className="text-xs font-bold text-[#A3A7B0] uppercase tracking-wider">ROOM #{code}</div>
              <div className="font-extrabold text-sm sm:text-base flex items-center gap-1.5">
                <span>{myFranchise}</span>
                <span className="text-[#A3A7B0]">·</span>
                <span className="text-xs font-medium text-[#A3A7B0]">{myDisplayName}</span>
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
                <span className="text-xs text-[#A3A7B0]">TIMER:</span>
                <span className={`text-xl font-black ${timeLeft <= 3 && timeLeft > 0 ? 'text-red-500 animate-pulse' : 'text-[#B6FF3B]'}`}>
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
              className="w-full max-w-md bg-[#111318] border border-[rgba(255,255,255,0.08)] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-300"
              style={{ borderTop: `6px solid ${ROLE_COLORS[activePlayerDetails.primary_role] || '#B6FF3B'}` }}
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
                  <span className="text-[#B6FF3B] font-black">{currentBidder}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full max-w-md bg-[#111318] border border-[rgba(255,255,255,0.08)] rounded-3xl p-12 text-center">
              <div className="animate-spin text-[#B6FF3B] inline-block mb-4">🏏</div>
              <h3 className="text-xl font-extrabold">Waiting for Next Player...</h3>
              <p className="text-xs text-[#A3A7B0] mt-1">The auctioneer will call the next cricketer to the stage.</p>
            </div>
          )}
        </div>

        {/* Action Button Section (Thumb-friendly Bottom Zone) */}
        <div className="mt-auto pt-4 max-w-md mx-auto w-full">
          <button
            onClick={handlePlaceBid}
            disabled={isHighestBidder || isPaused || !activePlayerDetails}
            className={`w-full py-5 px-6 rounded-2xl font-black text-lg sm:text-xl tracking-tight transition shadow-2xl flex flex-col items-center justify-center ${
              isHighestBidder
                ? 'bg-[#181B21] text-[#A3A7B0] border border-[rgba(255,255,255,0.08)] cursor-not-allowed'
                : isPaused
                ? 'bg-[#181B21] text-[#A3A7B0] cursor-not-allowed'
                : 'bg-[#B6FF3B] hover:bg-[#a3f024] text-black shadow-[0_0_30px_rgba(182,255,59,0.35)] active:scale-95'
            }`}
          >
            <span>{isHighestBidder ? 'YOU ARE HIGHEST BIDDER' : `BID ${formatCr(nextBidAmount)}`}</span>
            {!isHighestBidder && (
              <span className="text-[11px] font-extrabold opacity-75 uppercase tracking-wider">
                Click to raise bid
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Side Management Deck (Desktop / Mobile Tabs) */}
      <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-[rgba(255,255,255,0.08)] bg-[#111318] p-4 flex flex-col justify-between">
        <div>
          {/* Host Control Deck */}
          <div className="mb-6">
            <div className="text-xs font-bold text-[#A3A7B0] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Gavel size={14} /> AUCTIONEER COMMANDS
            </div>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => hostAction(isPaused ? 'resume' : 'pause')}
                className="p-2.5 bg-[#181B21] hover:bg-[#20242c] rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-[rgba(255,255,255,0.08)]"
              >
                {isPaused ? <Play size={16} className="text-[#B6FF3B]" /> : <Pause size={16} />}
                <span>{isPaused ? 'Resume' : 'Pause'}</span>
              </button>

              <button
                onClick={() => hostAction('skip')}
                className="p-2.5 bg-[#181B21] hover:bg-[#20242c] rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-[rgba(255,255,255,0.08)]"
              >
                <SkipForward size={16} />
                <span>Skip</span>
              </button>

              <button
                onClick={() => hostAction('mark_unsold')}
                className="p-2.5 bg-[#181B21] hover:bg-[#20242c] rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-[rgba(255,255,255,0.08)] text-red-400"
              >
                <X size={16} />
                <span>Unsold</span>
              </button>

              <button
                onClick={() => navigate(`/room/${code}/results`)}
                className="p-2.5 bg-[#181B21] hover:bg-[#20242c] rounded-xl text-xs font-bold flex flex-col items-center gap-1 border border-[rgba(255,255,255,0.08)] text-[#F5C542]"
              >
                <Award size={16} />
                <span>Results</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs for Right Panel */}
          <div className="flex border-b border-[rgba(255,255,255,0.08)] mb-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('teams')}
              className={`pb-2 px-3 border-b-2 transition ${activeTab === 'teams' ? 'border-[#B6FF3B] text-[#B6FF3B]' : 'border-transparent text-[#A3A7B0]'}`}
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

          {/* Tab 1: Teams Overview */}
          {activeTab === 'teams' && (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {ALL_FRANCHISES.map(f => (
                <div key={f.id} className="p-3 bg-[#181B21] rounded-xl border border-[rgba(255,255,255,0.04)] flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{f.emoji}</span>
                    <div>
                      <div className="font-extrabold text-xs" style={{ color: f.primary }}>{f.name}</div>
                      <div className="text-[10px] text-[#A3A7B0]">Max: {roomInfo?.max_squad_size || 10} players</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-[#F5F5F5]">
                      {formatCr(roomInfo?.starting_purse_lakhs || 12000)}
                    </div>
                    <div className="text-[10px] text-[#A3A7B0]">Purse</div>
                  </div>
                </div>
              ))}
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
