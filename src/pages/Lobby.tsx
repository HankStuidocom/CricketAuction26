import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ALL_FRANCHISES, FRANCHISE_MAP, formatCr, getOrCreateUserId, getRoomSession, saveRoomSession } from '../lib/utils';
import { safeFetch, getSocketUrl } from '../lib/api';
import { Users, Copy, Check, Play, MessageSquare, Shield, Crown, AlertCircle, UserCheck, ArrowLeft } from 'lucide-react';

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
      const data = await safeFetch(`/api/rooms/${cleanCode}`);
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
    <div className="min-h-screen bg-gradient-to-b from-[#05172E] via-[#020B18] to-[#020A16] text-[#F5F7FF] p-4 sm:p-6 max-w-6xl mx-auto flex flex-col justify-between font-['DM_Sans',sans-serif]">
      {/* Top Header with Back Button & Brand */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white transition"
            title="Back to Home"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex items-center gap-2">
            <i className="brand-mark"></i>
            <span className="font-extrabold text-lg tracking-tight font-['Manrope']">
              Crick<span className="text-[#D9FF4D]">Auction</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#0B1730] border border-white/10 rounded-xl text-xs font-mono font-bold hover:bg-[#122247] transition text-[#D9FF4D]"
            >
              <span>#{code}</span>
              {copied ? <Check size={14} className="text-[#D9FF4D]" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Room Title Strip */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-5 p-3.5 bg-[#0B1730] border border-white/10 rounded-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#D9FF4D]/15 text-[#D9FF4D] border border-[#D9FF4D]/30 tracking-wider">
                LOBBY
              </span>
              <h1 className="text-xl font-extrabold font-['Manrope'] text-white">{room?.room_name || `Room #${code}`}</h1>
              {isHost && <Crown size={18} className="text-[#F5C542]" />}
            </div>
            <p className="text-xs text-[#8993A8] mt-0.5">
              Purse: <b className="text-white">₹{(room?.starting_purse_lakhs || 12000) / 100} Cr</b> · Max Squad: <b className="text-white">{room?.max_squad_size || 10}</b> · Teams: <b className="text-white">{room?.max_teams || 10}</b>
            </p>
          </div>
        </div>

        {/* 10 Team Slots Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {ALL_FRANCHISES.map((team) => {
            const participant = room?.participants?.find((p: any) => p.franchise_id === team.id);
            const isMyTeam = participant?.user_id === myUserId || (participant?.is_ai && !myUserId && passedFranchise === team.id);
            const isAITeam = participant?.is_ai;
            
            return (
              <div
                key={team.id}
                className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between items-center text-center min-h-[145px] relative overflow-hidden transition ${
                  isMyTeam
                    ? 'border-[#D9FF4D] bg-[#0E1E3C] shadow-[0_0_15px_rgba(217,255,77,0.25)]'
                    : participant
                    ? 'border-white/15 bg-[#061224]'
                    : 'border-white/10 bg-[#061224]/60'
                }`}
                style={{ borderTop: `4px solid ${team.primary}` }}
              >
                {/* Badges */}
                <div className="absolute top-2.5 right-2.5 flex gap-1">
                  {isMyTeam && !isAITeam && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#D9FF4D] text-[#07111E] uppercase tracking-wider">
                      YOU
                    </span>
                  )}
                  {isMyTeam && isAITeam && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-500 text-white uppercase tracking-wider">
                      AI
                    </span>
                  )}
                  {participant?.is_host && !isMyTeam && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#F5C542] text-black uppercase tracking-wider">
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
                  <div className="text-[11px] text-[#8993A8] truncate font-medium mt-0.5">
                    {participant 
                      ? (isAITeam ? `🤖 ${participant.display_name}` : participant.display_name)
                      : 'Open Slot'}
                  </div>
                  {participant && !isAITeam && (
                    <div className="text-[10px] text-[#D9FF4D] font-mono mt-1 font-bold">
                      Purse: {formatCr(participant.purse_remaining_lakhs)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat / Announcements */}
        <div className="bg-[#0B1730] border border-white/10 rounded-2xl p-4 flex flex-col h-48">
          <div className="text-xs font-bold text-[#8993A8] uppercase tracking-wider mb-2 flex items-center gap-2">
            <MessageSquare size={14} /> Room Chat & Events
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 text-xs sm:text-sm">
            <div className="text-xs text-[#8993A8] italic">Welcome to the lobby! Chat with your opponents before the bidding begins.</div>
            {chatMessages.map((m, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="font-bold text-[#D9FF4D]">{m.sender}:</span>
                <span className="text-[#F5F7FF]">{m.message}</span>
              </div>
            ))}
          </div>
          <form onSubmit={sendChat} className="flex gap-2 mt-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message to lobby..."
              className="flex-1 bg-[#061224] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D9FF4D]"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#D9FF4D] text-[#07111E] font-black text-xs rounded-xl hover:bg-[#c7f035] transition"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Start Button at Bottom - Only for Host */}
      {isHost && (
        <div className="mt-5 pt-3 border-t border-white/10 flex justify-end">
          <button
            onClick={startAuction}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#D9FF4D] hover:bg-[#c7f035] text-[#07111E] font-black text-sm uppercase tracking-wider rounded-xl transition shadow-[0_0_25px_rgba(217,255,77,0.35)] flex items-center justify-center gap-2"
          >
            <Play size={18} fill="#07111E" /> START AUCTION
          </button>
        </div>
      )}
      {!isHost && room && (
        <div className="mt-5 pt-3 border-t border-white/10 text-center text-xs text-[#8993A8]">
          Waiting for host to start the auction...
        </div>
      )}
    </div>
  );
}