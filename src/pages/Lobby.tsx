import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ALL_FRANCHISES, formatCr, getOrCreateUserId, getRoomSession, saveRoomSession } from '../lib/utils';
import { safeFetch, getSocketUrl } from '../lib/api';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import { 
  CricketBatBallIcon, 
  CrownHostIcon, 
  TacticalChatIcon, 
  PlayArrowIcon, 
  ShareInviteIcon 
} from '../components/GameIcons';
import { ArrowLeft, Copy, Check, AlertCircle } from 'lucide-react';

export default function Lobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [room, setRoom] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedSession = getRoomSession(code || '');
  const passedFranchise = location.state?.franchise || savedSession.franchise || 'CSK';
  const passedDisplayName = location.state?.displayName || savedSession.displayName || 'Player';
  const passedPassword = location.state?.password || savedSession.password;
  const initialUserId = location.state?.userId || savedSession.userId || getOrCreateUserId();
  const [myUserId, setMyUserId] = useState<string>(initialUserId);

  useEffect(() => {
    saveRoomSession(code || '', {
      franchise: passedFranchise,
      displayName: passedDisplayName,
      userId: initialUserId,
      password: passedPassword
    });
  }, [code, passedFranchise, passedDisplayName, initialUserId, passedPassword]);

  useEffect(() => {
    fetchRoomDetails();

    const token = localStorage.getItem('ca26_token');
    const s = io(getSocketUrl(), { auth: { token } });
    setSocket(s);

    s.on('connect', () => {
      s.emit('join_room', {
        roomCode: code,
        userId: initialUserId,
        franchise: passedFranchise,
        displayName: passedDisplayName,
        password: passedPassword
      });
    });

    s.on('room_joined', (data) => {
      if (data.room) setRoom(data.room);
      if (data.participant?.user_id) setMyUserId(data.participant.user_id);
      fetchRoomDetails();
    });

    s.on('participant_joined', () => {
      fetchRoomDetails();
    });

    s.on('chat_message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    s.on('auction_started', () => {
      const activeUid = myUserId || initialUserId;
      saveRoomSession(code || '', {
        franchise: passedFranchise,
        displayName: passedDisplayName,
        userId: activeUid,
        password: passedPassword
      });
      navigate(`/room/${code}/auction`, {
        state: { displayName: passedDisplayName, franchise: passedFranchise, userId: activeUid }
      });
    });

    s.on('error', (err) => {
      setError(err.message || 'Lobby error');
    });

    return () => {
      s.disconnect();
    };
  }, [code, passedFranchise, passedDisplayName, passedPassword]);

  const fetchRoomDetails = async (retries = 3) => {
    if (!code) return;
    try {
      const cleanCode = code.trim().toUpperCase();
      const data = await safeFetch<any>(`/api/rooms/${cleanCode}`);
      setRoom(data);
      setError(null);
    } catch (err: any) {
      if (retries > 0) {
        setTimeout(() => fetchRoomDetails(retries - 1), 1000);
      } else {
        setError(err.message);
      }
    }
  };

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('send_chat', {
      roomCode: code,
      sender: passedDisplayName,
      message: chatInput
    });
    setChatInput('');
  };

  const startAuction = async () => {
    if (socket && code && myUserId) {
      socket.emit('start_auction', { roomCode: code, userId: myUserId });
    }
  };

  const isHost = room?.host_id === myUserId;

  return (
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] p-4 sm:p-6 max-w-6xl mx-auto flex flex-col justify-between font-sans">
      {/* Top Header with Back Button & Brand */}
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1F2937]">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-[6px] bg-[#111827] border border-[#1F2937] flex items-center justify-center text-[#86948A] hover:text-[#DFE2EF] hover:border-[#10B981] transition"
            title="Back to Home"
          >
            <ArrowLeft size={16} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[6px] bg-[#111827] border border-[#1F2937] flex items-center justify-center shadow-inner">
              <CricketBatBallIcon size={16} color="#10B981" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight text-white">
              CRICK<span className="text-[#10B981]">AUCTION</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-[#86948A] bg-[#1C1F29] px-1.5 py-0.5 rounded-[4px] border border-[#1F2937]">
              LOBBY
            </span>
          </div>

          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] border border-[#10B981]/40 hover:border-[#10B981] rounded-[4px] text-xs font-mono font-bold text-[#10B981] transition shadow-sm"
            title="Copy Arena Code"
          >
            <span>#{code}</span>
            {copied ? <Check size={13} className="text-[#10B981]" /> : <Copy size={13} />}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#FFB4AB] rounded-[6px] text-xs font-medium flex items-center gap-2">
            <AlertCircle size={15} className="text-[#EF4444]" />
            <span>{error}</span>
          </div>
        )}

        {/* Room Title Strip */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 p-4 rounded-[6px] bg-[#111827] border border-[#1F2937]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-display font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 tracking-wider">
                PRE-MATCH LOBBY
              </span>
              <h1 className="text-lg sm:text-xl font-display font-black text-white">
                {room?.room_name || `Arena #${code}`}
              </h1>
              {isHost && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 text-[9px] font-mono font-bold uppercase">
                  <CrownHostIcon size={11} color="#F59E0B" /> HOST COMMANDER
                </span>
              )}
            </div>
            <p className="text-xs text-[#86948A] mt-1">
              Starting Purse: <b className="text-[#10B981] font-mono">₹{(room?.starting_purse_lakhs || 12000) / 100} Cr</b> · Max Squad: <b className="text-white font-mono">{room?.max_squad_size || 10}</b> · Capacity: <b className="text-white font-mono">{room?.participants?.length || 0}/{room?.max_teams || 10} Slots</b>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <GameButton
              onClick={copyCode}
              variant="secondary"
              size="sm"
              icon={<ShareInviteIcon size={14} />}
            >
              {copied ? 'Copied!' : 'Share Passcode'}
            </GameButton>
          </div>
        </div>

        {/* 10 Team Slots Grid */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#86948A]">
              Tournament Franchise Slots ({room?.participants?.length || 0}/10 Ready)
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ALL_FRANCHISES.map((team) => {
              const participant = room?.participants?.find((p: any) => p.franchise_id === team.id);
              const isMyTeam = participant?.user_id === myUserId || (participant?.is_ai && !myUserId && passedFranchise === team.id);
              const isAITeam = participant?.is_ai;
              
              return (
                <div
                  key={team.id}
                  className={`p-3.5 rounded-[6px] border flex flex-col justify-between items-center text-center min-h-[150px] relative overflow-hidden transition-all duration-150 ${
                    isMyTeam
                      ? 'border-[#10B981] bg-[#1C1F29] shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : participant
                      ? 'border-[#1F2937] bg-[#111827]'
                      : 'border-[#1F2937]/50 bg-[#0F131C] opacity-50'
                  }`}
                  style={{ borderTop: `3px solid ${team.primary}` }}
                >
                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {isMyTeam && !isAITeam && (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono font-bold bg-[#10B981] text-[#090D16] uppercase tracking-wider">
                        YOU
                      </span>
                    )}
                    {isAITeam && (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono font-bold bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 uppercase tracking-wider">
                        AI
                      </span>
                    )}
                    {participant?.is_host && !isMyTeam && (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[9px] font-mono font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 uppercase tracking-wider">
                        HOST
                      </span>
                    )}
                  </div>

                  {/* Centered Logo */}
                  <div className="w-full flex-1 flex items-center justify-center py-2">
                    {team.logoUrl ? (
                      <img 
                        src={team.logoUrl} 
                        alt={team.id} 
                        className="h-14 w-auto max-w-[80%] object-contain drop-shadow" 
                      />
                    ) : (
                      <div className="text-2xl">{team.emoji}</div>
                    )}
                  </div>

                  {/* Team Info */}
                  <div className="w-full text-center mt-1">
                    <div className="text-sm font-display font-black tracking-wide" style={{ color: team.primary }}>
                      {team.id}
                    </div>
                    <div className="text-[11px] text-[#86948A] truncate font-bold mt-0.5">
                      {participant 
                        ? (isAITeam ? `🤖 ${participant.display_name}` : participant.display_name)
                        : 'Open Slot'}
                    </div>
                    {participant && (
                      <div className="text-[10px] text-[#10B981] font-mono mt-1 font-bold">
                        {formatCr(participant.purse_remaining_lakhs)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tactical Comms Deck */}
        <GamePanel noPadding className="mb-4">
          <div className="p-3 border-b border-[#1F2937] bg-[#181B25] flex items-center justify-between">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-[#86948A] flex items-center gap-2">
              <TacticalChatIcon size={14} color="#86948A" /> Arena Comms Relay
            </span>
            <span className="text-[10px] text-[#86948A] font-mono">
              {chatMessages.length} Messages
            </span>
          </div>

          <div className="p-3 h-36 overflow-y-auto space-y-2 text-xs bg-[#0F131C]">
            <div className="text-xs text-[#86948A] italic">
              Channel open. Coordinate tactics and scout opposition budgets before live bidding commences.
            </div>
            {chatMessages.map((m, idx) => (
              <div key={idx} className="flex gap-2 items-baseline">
                <span className="font-display font-black text-[#10B981]">{m.sender}:</span>
                <span className="text-[#DFE2EF]">{m.message}</span>
              </div>
            ))}
          </div>

          <form onSubmit={sendChat} className="p-2.5 border-t border-[#1F2937] bg-[#111827] flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Transmit tactical message to arena..."
              className="flex-1 bg-[#0F131C] border border-[#1F2937] rounded-[4px] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#10B981]"
            />
            <GameButton
              type="submit"
              variant="primary"
              size="sm"
            >
              TRANSMIT
            </GameButton>
          </form>
        </GamePanel>
      </div>

      {/* Start Button at Bottom - Only for Host */}
      {isHost && (
        <div className="mt-4 pt-3 border-t border-[#1F2937] flex justify-end">
          <GameButton
            onClick={startAuction}
            variant="primary"
            size="lg"
            fullWidth
            className="sm:w-auto px-8"
            icon={<PlayArrowIcon size={18} color="#090D16" />}
          >
            COMMENCE LIVE BIDDING
          </GameButton>
        </div>
      )}

      {!isHost && room && (
        <div className="mt-4 pt-3 border-t border-[#1F2937] text-center text-xs text-[#86948A] flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
          <span>Awaiting host commander to commence live bidding stream...</span>
        </div>
      )}
    </div>
  );
}