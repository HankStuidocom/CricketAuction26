import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ALL_FRANCHISES, FRANCHISE_MAP, formatCr, getOrCreateUserId, getRoomSession, saveRoomSession } from '../lib/utils';
import { safeFetch, getSocketUrl } from '../lib/api';
import { Users, Copy, Check, Play, MessageSquare, Shield, Crown, AlertCircle, UserCheck } from 'lucide-react';

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
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] p-4 sm:p-6 max-w-6xl mx-auto pitch-bg flex flex-col justify-between">
      {/* Top Header */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-[#B6FF3B]/10 text-[#B6FF3B] border border-[#B6FF3B]/20">
                LOBBY
              </span>
              <h1 className="text-2xl font-black">{room?.room_name || `Room #${code}`}</h1>
              {isHost && <Crown size={18} className="text-[#F5C542]" />}
            </div>
            <p className="text-xs text-[#A3A7B0] mt-1">Starting purse: ₹{(room?.starting_purse_lakhs || 12000) / 100} Cr · Squad: {room?.max_squad_size || 10} players · Max teams: {room?.max_teams || 10}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={copyCode}
              className="flex items-center gap-2 px-4 py-2 bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm font-mono font-bold hover:bg-[#20242c] transition"
            >
              <span>{code}</span>
              {copied ? <Check size={16} className="text-[#B6FF3B]" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* 10 Team Slots Grid - Based on Reference Image Game Lobby */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {ALL_FRANCHISES.map((team) => {
            const participant = room?.participants?.find((p: any) => p.franchise_id === team.id);
            const isMyTeam = participant?.user_id === myUserId || (participant?.is_ai && !myUserId && passedFranchise === team.id);
            const isAITeam = participant?.is_ai;
            
            return (
              <div
                key={team.id}
                className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between items-center text-center min-h-[145px] relative overflow-hidden transition ${
                  isMyTeam
                    ? 'border-[#B6FF3B] bg-[#181B21] shadow-[0_0_15px_rgba(182,255,59,0.2)]'
                    : participant
                    ? 'border-[rgba(255,255,255,0.15)] bg-[#15181F]'
                    : 'border-[rgba(255,255,255,0.08)] bg-[#111318]'
                }`}
                style={{ borderTop: `4px solid ${team.primary}` }}
              >
                {/* Badges */}
                <div className="absolute top-2.5 right-2.5 flex gap-1">
                  {isMyTeam && !isAITeam && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#B6FF3B] text-black uppercase tracking-wider">
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

                {/* Big Prominent Centered Logo */}
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
                  <div className="text-sm sm:text-base font-black tracking-wide" style={{ color: team.primary }}>
                    {team.id}
                  </div>
                  <div className="text-[11px] text-[#A3A7B0] truncate font-medium mt-0.5">
                    {participant 
                      ? (isAITeam ? `🤖 ${participant.display_name}` : participant.display_name)
                      : 'Open Slot'}
                  </div>
                  {participant && !isAITeam && (
                    <div className="text-[10px] text-[#B6FF3B] font-mono mt-1">
                      Purse: {formatCr(participant.purse_remaining_lakhs)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Chat / Announcements */}
        <div className="bg-[#111318] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 flex flex-col h-48">
          <div className="text-xs font-bold text-[#A3A7B0] uppercase tracking-wider mb-2 flex items-center gap-2">
            <MessageSquare size={14} /> Room Chat & Events
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2 text-sm">
            <div className="text-xs text-[#A3A7B0] italic">Welcome to the lobby! Chat with your opponents before the bidding begins.</div>
            {chatMessages.map((m, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="font-bold text-[#B6FF3B]">{m.sender}:</span>
                <span className="text-[#F5F5F5]">{m.message}</span>
              </div>
            ))}
          </div>
          <form onSubmit={sendChat} className="flex gap-2 mt-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Send message..."
              className="flex-1 bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl px-3 py-1.5 text-xs text-[#F5F5F5] focus:outline-none focus:border-[#B6FF3B]"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#B6FF3B] text-black font-bold text-xs rounded-xl hover:bg-[#a3f024]"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Start Button at Bottom - Only for Host */}
      {isHost && (
        <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.08)] flex justify-end">
          <button
            onClick={startAuction}
            className="w-full sm:w-auto px-8 py-4 bg-[#B6FF3B] hover:bg-[#a3f024] text-black font-black text-sm rounded-xl transition shadow-[0_0_25px_rgba(182,255,59,0.3)] flex items-center justify-center gap-2"
          >
            <Play size={18} fill="black" /> START AUCTION
          </button>
        </div>
      )}
      {!isHost && room && (
        <div className="mt-6 pt-4 border-t border-[rgba(255,255,255,0.08)] text-center text-xs text-[#A3A7B0]">
          Waiting for host to start the auction...
        </div>
      )}
    </div>
  );
}