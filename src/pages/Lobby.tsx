import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ALL_FRANCHISES, FRANCHISE_MAP, formatCr, getOrCreateUserId, getRoomSession, saveRoomSession } from '../lib/utils';
import { safeFetch, getSocketUrl } from '../lib/api';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import { 
  CricketBatBallIcon, 
  CrownHostIcon, 
  BotsAiIcon, 
  TacticalChatIcon, 
  PlayArrowIcon, 
  ShareInviteIcon, 
  CheckmarkIcon, 
  PurseCoinsIcon 
} from '../components/GameIcons';
import { ArrowLeft, Copy, Check, MessageSquare, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-[#020814] text-[#F8FAFC] p-4 sm:p-6 max-w-6xl mx-auto flex flex-col justify-between font-['DM_Sans',sans-serif]">
      {/* Top Header with Back Button & Brand */}
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/8">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white transition"
            title="Back to Home"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#102D5E] to-[#08152E] border border-white/15 flex items-center justify-center">
              <CricketBatBallIcon size={16} color="#D9FF4D" />
            </div>
            <span className="font-['Manrope'] font-black text-lg tracking-tight">
              Crick<span className="text-[#D9FF4D]">Auction</span>
            </span>
          </div>

          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#081329] border border-[#D9FF4D]/30 hover:border-[#D9FF4D] rounded-xl text-xs font-mono font-black text-[#D9FF4D] transition shadow-md"
            title="Copy Arena Code"
          >
            <span>#{code}</span>
            {copied ? <Check size={14} className="text-[#D9FF4D]" /> : <Copy size={14} />}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs font-medium flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Room Title Strip */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 p-4 rounded-2xl bg-gradient-to-r from-[#0C1E3C] to-[#061022] border border-white/10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#D9FF4D]/15 text-[#D9FF4D] border border-[#D9FF4D]/30 tracking-wider">
                PRE-MATCH LOBBY
              </span>
              <h1 className="text-lg sm:text-xl font-black font-['Manrope'] text-white">
                {room?.room_name || `Arena #${code}`}
              </h1>
              {isHost && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[9px] font-extrabold uppercase">
                  <CrownHostIcon size={11} color="#FBBF24" /> HOST
                </span>
              )}
            </div>
            <p className="text-xs text-[#8993A8] mt-1">
              Starting Purse: <b className="text-[#D9FF4D]">₹{(room?.starting_purse_lakhs || 12000) / 100} Cr</b> · Max Squad: <b className="text-white">{room?.max_squad_size || 10}</b> · Capacity: <b className="text-white">{room?.participants?.length || 0}/{room?.max_teams || 10} Teams</b>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <GameButton
              onClick={copyCode}
              variant="glass"
              size="sm"
              icon={<ShareInviteIcon size={14} />}
            >
              {copied ? 'Copied!' : 'Share Room'}
            </GameButton>
          </div>
        </div>

        {/* 10 Team Slots Grid */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="font-['Manrope'] font-extrabold text-xs uppercase tracking-wider text-[#8993A8]">
              Tournament Slots ({room?.participants?.length || 0}/10 Joined)
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
                  className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between items-center text-center min-h-[155px] relative overflow-hidden transition-all duration-200 ${
                    isMyTeam
                      ? 'border-[#D9FF4D] bg-[#0E2042] shadow-[0_0_20px_rgba(217,255,77,0.25)]'
                      : participant
                      ? 'border-white/15 bg-[#061224]'
                      : 'border-white/8 bg-[#040C18]/60 opacity-60'
                  }`}
                  style={{ borderTop: `4px solid ${team.primary}` }}
                >
                  {/* Badges */}
                  <div className="absolute top-2.5 right-2.5 flex gap-1">
                    {isMyTeam && !isAITeam && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-[#D9FF4D] text-[#051120] uppercase tracking-wider">
                        YOU
                      </span>
                    )}
                    {isAITeam && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                        AI
                      </span>
                    )}
                    {participant?.is_host && !isMyTeam && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
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
                        className="h-14 sm:h-16 w-auto max-w-[80%] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]" 
                      />
                    ) : (
                      <div className="text-2xl">{team.emoji}</div>
                    )}
                  </div>

                  {/* Team Info */}
                  <div className="w-full text-center mt-1">
                    <div className="text-sm sm:text-base font-black tracking-wide font-['Manrope']" style={{ color: team.primary }}>
                      {team.id}
                    </div>
                    <div className="text-[11px] text-[#8993A8] truncate font-bold mt-0.5">
                      {participant 
                        ? (isAITeam ? `🤖 ${participant.display_name}` : participant.display_name)
                        : 'Open Slot'}
                    </div>
                    {participant && (
                      <div className="text-[10px] text-[#D9FF4D] font-mono mt-1 font-bold">
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
          <div className="p-3.5 border-b border-white/8 bg-white/[0.02] flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-[#8993A8] flex items-center gap-2 font-['Manrope']">
              <TacticalChatIcon size={14} color="#8993A8" /> Arena Comms Channel
            </span>
            <span className="text-[10px] text-[#8993A8] font-mono">
              {chatMessages.length} Messages
            </span>
          </div>

          <div className="p-3 h-40 overflow-y-auto space-y-2 text-xs">
            <div className="text-xs text-[#8993A8] italic">
              Welcome to the arena lobby! Discuss auction strategy before bidding begins.
            </div>
            {chatMessages.map((m, idx) => (
              <div key={idx} className="flex gap-2 items-baseline">
                <span className="font-black text-[#D9FF4D] font-['Manrope']">{m.sender}:</span>
                <span className="text-[#F8FAFC]">{m.message}</span>
              </div>
            ))}
          </div>

          <form onSubmit={sendChat} className="p-3 border-t border-white/8 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message to arena..."
              className="flex-1 bg-[#050E1D] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D9FF4D]"
            />
            <GameButton
              type="submit"
              variant="primary"
              size="sm"
            >
              SEND
            </GameButton>
          </form>
        </GamePanel>
      </div>

      {/* Start Button at Bottom - Only for Host */}
      {isHost && (
        <div className="mt-4 pt-3 border-t border-white/8 flex justify-end">
          <GameButton
            onClick={startAuction}
            variant="primary"
            size="lg"
            fullWidth
            className="sm:w-auto px-10 shadow-[0_0_30px_rgba(217,255,77,0.4)]"
            icon={<PlayArrowIcon size={18} color="#051120" />}
          >
            START LIVE AUCTION
          </GameButton>
        </div>
      )}

      {!isHost && room && (
        <div className="mt-4 pt-3 border-t border-white/8 text-center text-xs text-[#8993A8] flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping"></span>
          <span>Waiting for host to commence live bidding...</span>
        </div>
      )}
    </div>
  );
}