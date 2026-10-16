import React, { useState, useEffect, useRef } from 'react';
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
import { ArrowLeft, Copy, Check, AlertCircle, RefreshCw, UserPlus, X, Users } from 'lucide-react';
import { ServerHealthBadge } from '../components/ServerHealthBadge';

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
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [switching, setSwitching] = useState<string | null>(null); // franchise being switched to

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [invitedMap, setInvitedMap] = useState<Record<string, boolean>>({});
  const [inviteStatusMsg, setInviteStatusMsg] = useState<string | null>(null);

  const savedSession = getRoomSession(code || '');
  const passedFranchise = location.state?.franchise || savedSession.franchise || 'CSK';
  const passedDisplayName = location.state?.displayName || savedSession.displayName || 'Player';
  const passedPassword = location.state?.password || savedSession.password;
  const initialUserId = location.state?.userId || savedSession.userId || getOrCreateUserId();

  const [myUserId] = useState<string>(initialUserId);
  // Track the user's current franchise (can change during lobby)
  const [myFranchise, setMyFranchise] = useState<string>(passedFranchise);
  const socketRef = useRef<Socket | null>(null);
  const isGameManager = myFranchise === 'ADMIN';

  useEffect(() => {
    saveRoomSession(code || '', {
      franchise: myFranchise,
      displayName: passedDisplayName,
      userId: initialUserId,
      password: passedPassword
    });
  }, [code, myFranchise, passedDisplayName, initialUserId, passedPassword]);

  useEffect(() => {
    fetchRoomDetails();

    const token = localStorage.getItem('ca26_token');
    const s = io(getSocketUrl(), { auth: { token } });
    setSocket(s);
    socketRef.current = s;

    s.on('connect', () => {
      s.emit('join_room', {
        roomCode: code,
        userId: myUserId,
        franchise: isGameManager ? undefined : myFranchise,
        displayName: passedDisplayName,
        password: passedPassword,
        isManager: isGameManager
      });
    });

    s.on('join_handshake_success', (data) => {
      if (data.room) setRoom(data.room);
      if (data.role === 'COMMISSIONER') {
        setMyFranchise('ADMIN');
      } else if (data.franchise) {
        setMyFranchise(data.franchise);
      } else if (data.participant?.franchise_id) {
        setMyFranchise(data.participant.franchise_id);
      }
      fetchRoomDetails();
    });

    s.on('join_error', (data) => {
      let friendlyMsg = data.message;
      if (data.code === 'ROOM_NOT_FOUND') {
        friendlyMsg = 'Room not found. Please check the code.';
      } else if (data.code === 'ROOM_CANCELLED') {
        friendlyMsg = 'This auction room has been cancelled by the host.';
      } else if (data.code === 'INVALID_PASSWORD') {
        friendlyMsg = 'Incorrect password for this private room.';
      } else if (data.code === 'FRANCHISE_TAKEN') {
        friendlyMsg = data.message || 'This team is already taken by another player.';
      } else if (data.code === 'ROOM_FULL') {
        friendlyMsg = 'Room is full (max teams reached).';
      }
      setError(friendlyMsg);
    });

    s.on('room_cancelled', (data) => {
      setError(data.message || 'Room was cancelled by the host.');
    });

    s.on('kicked_from_room', (data) => {
      setError(data.message || 'You were removed from this room by the commissioner.');
      setTimeout(() => navigate('/'), 3000);
    });

    s.on('room_joined', (data) => {
      if (data.room) setRoom(data.room);
      // Confirm our actual franchise from server
      if (data.participant?.franchise_id) setMyFranchise(data.participant.franchise_id);
      fetchRoomDetails();
    });

    s.on('room_state', (state) => {
      setRoom(state);
      // Keep our franchise in sync if someone else took ours
      const mySlot = state.participants?.find((p: any) => p.user_id === myUserId);
      if (mySlot?.franchise_id) setMyFranchise(mySlot.franchise_id);
    });

    s.on('participant_joined', () => {
      fetchRoomDetails();
    });

    s.on('franchise_switched', (data) => {
      setSwitching(null);
      if (data.newFranchise) {
        setMyFranchise(data.newFranchise);
        saveRoomSession(code || '', {
          franchise: data.newFranchise,
          displayName: passedDisplayName,
          userId: myUserId,
          password: passedPassword
        });
      }
      fetchRoomDetails();
    });

    s.on('chat_message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    s.on('auction_started', () => {
      const franchise = myFranchise;
      saveRoomSession(code || '', {
        franchise,
        displayName: passedDisplayName,
        userId: myUserId,
        password: passedPassword
      });
      navigate(`/room/${code}/auction`, {
        state: { displayName: passedDisplayName, franchise, userId: myUserId, manager: franchise === 'ADMIN' }
      });
    });

    s.on('error', (err) => {
      setError(err.message || 'Lobby error');
      setSwitchError(err.message || 'Could not switch team');
      setSwitching(null);
      setTimeout(() => setSwitchError(null), 4000);
    });

    return () => {
      s.disconnect();
    };
  }, [code]);

  const fetchRoomDetails = async (retries = 3) => {
    if (!code) return;
    try {
      const cleanCode = code.trim().toUpperCase();
      const data = await safeFetch<any>(`/api/rooms/${cleanCode}`);
      setRoom(data);
      setError(null);
      // Sync my franchise from server state
      const mySlot = data.participants?.find((p: any) => p.user_id === myUserId);
      if (mySlot?.franchise_id) setMyFranchise(mySlot.franchise_id);
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

  const startAuction = () => {
    if (socket && code && myUserId) {
      socket.emit('start_auction', { roomCode: code, userId: myUserId });
    }
  };

  const fetchFriendsForInvite = async () => {
    const token = localStorage.getItem('ca26_token');
    if (!token) return;
    setFriendsLoading(true);
    try {
      const list = await safeFetch<any[]>('/api/friends');
      if (Array.isArray(list)) {
        setFriendsList(list);
      }
    } catch (err: any) {
      console.error('Failed to load friends:', err);
    } finally {
      setFriendsLoading(false);
    }
  };

  const handleSendRoomInvite = async (friendId: string, friendName: string) => {
    if (!code) return;
    try {
      await safeFetch('/api/friends/invite', {
        method: 'POST',
        body: JSON.stringify({ roomCode: code.trim().toUpperCase(), friendId })
      });
      setInvitedMap((prev) => ({ ...prev, [friendId]: true }));
      setInviteStatusMsg(`Invite sent to ${friendName}!`);
      setTimeout(() => setInviteStatusMsg(null), 3000);
    } catch (err: any) {
      setInviteStatusMsg(err.message || 'Failed to send invite');
      setTimeout(() => setInviteStatusMsg(null), 3000);
    }
  };

  const isHost = room?.host_id === myUserId;
  const isLobby = room?.status === 'LOBBY';
  const participantCount = room?.participants?.length || 0;

  const handleSwitchFranchise = (newFranchise: string) => {
    if (!socket || !code || !myUserId) return;
    if (newFranchise === myFranchise) return;
    if (room?.status !== 'LOBBY') return;

    if (newFranchise !== 'ADMIN') {
      // Check client-side if taken by another human
      const targetSlot = room?.participants?.find(
        (p: any) => p.franchise_id === newFranchise && !p.is_ai && p.user_id !== myUserId
      );
      if (targetSlot) {
        setSwitchError(`${newFranchise} is already taken by ${targetSlot.display_name}`);
        setTimeout(() => setSwitchError(null), 3000);
        return;
      }
    }

    setSwitching(newFranchise);
    setSwitchError(null);
    socket.emit('switch_franchise', { roomCode: code, userId: myUserId, newFranchise });
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] p-4 sm:p-6 max-w-6xl mx-auto flex flex-col justify-between font-sans">
      {/* ── Header ── */}
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
            <span className="font-display font-bold text-lg tracking-tight text-white">
              CRICK<span className="text-[#10B981]">AUCTION</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-[#86948A] bg-[#1C1F29] px-1.5 py-0.5 rounded-[4px] border border-[#1F2937]">
              LOBBY
            </span>
          </div>

          <div className="flex items-center gap-2">
            <ServerHealthBadge compact />
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111827] border border-[#10B981]/40 hover:border-[#10B981] rounded-[4px] text-xs font-mono font-bold text-[#10B981] transition shadow-sm"
              title="Copy Room Code"
            >
              <span>#{code}</span>
              {copied ? <Check size={13} className="text-[#10B981]" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#FFB4AB] rounded-[6px] text-xs font-medium flex items-center gap-2">
            <AlertCircle size={15} className="text-[#EF4444]" />
            <span>{error}</span>
          </div>
        )}

        {switchError && (
          <div className="mb-4 p-3 bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#FFDB93] rounded-[6px] text-xs font-medium flex items-center gap-2">
            <AlertCircle size={15} className="text-[#F59E0B]" />
            <span>{switchError}</span>
          </div>
        )}

        {/* ── Room Title Strip ── */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 p-4 rounded-[6px] bg-[#111827] border border-[#1F2937]">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-display font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 tracking-wider">
                ROOM LOBBY
              </span>
              <h1 className="text-lg sm:text-xl font-display font-black text-white">
                {room?.room_name || `Room #${code}`}
              </h1>
              {isHost && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 text-[9px] font-mono font-bold uppercase">
                  <CrownHostIcon size={11} color="#F59E0B" /> HOST
                </span>
              )}
            </div>
            <p className="text-xs text-[#86948A] mt-1">
              Starting Purse: <b className="text-[#10B981] font-mono">₹{(room?.starting_purse_lakhs || 12000) / 100} Cr</b>
              {' · '}Squad Size: <b className="text-white font-mono">{room?.min_squad_size || 5} - {room?.max_squad_size || 10}</b>
              {' · '}Teams: <b className="text-white font-mono">{participantCount}/{room?.max_teams || 10}</b>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <GameButton
              onClick={() => {
                setShowInviteModal(true);
                fetchFriendsForInvite();
              }}
              variant="secondary"
              size="sm"
              icon={<UserPlus size={14} className="text-[#10B981]" />}
            >
              Invite Friends
            </GameButton>
            <GameButton
              onClick={() => fetchRoomDetails()}
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={13} />}
            >
              Refresh
            </GameButton>
            <GameButton
              onClick={copyCode}
              variant="secondary"
              size="sm"
              icon={<ShareInviteIcon size={14} />}
            >
              {copied ? 'Copied!' : 'Share Code'}
            </GameButton>
          </div>
        </div>

        {/* ── You are section ── */}
        <div className="mb-4 p-3 rounded-[6px] bg-[#1C1F29] border border-[#10B981]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-mono font-bold uppercase ${
              isGameManager ? 'bg-[#F59E0B] text-[#090D16]' : 'bg-[#10B981] text-[#090D16]'
            }`}>
              {isGameManager ? 'MANAGER' : 'YOU'}
            </span>
            <span className="text-sm font-display font-bold text-white">{passedDisplayName}</span>
            <span className="text-[11px] text-[#86948A]">{isGameManager ? 'active role:' : 'playing as'}</span>
            <span
              className="text-sm font-display font-black"
              style={{ color: isGameManager ? '#FFB95F' : ALL_FRANCHISES.find(f => f.id === myFranchise)?.primary || '#10B981' }}
            >
              {isGameManager ? 'GAME MANAGER (ADMIN)' : myFranchise}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isLobby && isHost && (
              isGameManager ? (
                <span className="text-[11px] text-[#86948A] italic">Click any open franchise below to take a team</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSwitchFranchise('ADMIN')}
                  className="px-2.5 py-1 rounded-[4px] bg-[#F59E0B]/15 border border-[#F59E0B]/40 hover:bg-[#F59E0B]/25 text-[#FFB95F] text-[10px] font-mono font-bold transition flex items-center gap-1"
                >
                  <CrownHostIcon size={12} color="#F59E0B" /> SWITCH TO ADMIN ROLE
                </button>
              )
            )}
            {isLobby && !isHost && (
              <span className="text-[11px] text-[#86948A] italic">Click any open slot to switch</span>
            )}
          </div>
        </div>

        {/* ── 10 Team Slots Grid ── */}
        <div className="mb-5">
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#86948A]">
              Team Slots ({participantCount}/{room?.max_teams || 10} Ready)
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {ALL_FRANCHISES.map((team) => {
              const participant = room?.participants?.find((p: any) => p.franchise_id === team.id);
              const isMyTeam = myFranchise === team.id;
              const isAITeam = participant?.is_ai;
              const isTakenByOther = participant && !isAITeam && participant.user_id !== myUserId;
              const isOpen = !participant;
              const isSwitching = switching === team.id;
              const canSwitch = isLobby && !isMyTeam && !isTakenByOther;

              return (
                <div
                  key={team.id}
                  onClick={() => canSwitch ? handleSwitchFranchise(team.id) : undefined}
                  className={`p-3.5 rounded-[6px] border flex flex-col justify-between items-center text-center min-h-[145px] relative overflow-hidden transition-all duration-150 ${
                    isMyTeam
                      ? 'border-[#10B981] bg-[#1C1F29] shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : isTakenByOther
                      ? 'border-[#1F2937] bg-[#111827]'
                      : canSwitch
                      ? 'border-[#1F2937]/50 bg-[#0F131C] hover:border-[#10B981]/50 hover:bg-[#1C1F29]/50 cursor-pointer'
                      : 'border-[#1F2937]/50 bg-[#0F131C] opacity-40'
                  } ${isSwitching ? 'animate-pulse border-[#F59E0B]' : ''}`}
                  style={{ borderTop: `3px solid ${team.primary}` }}
                  title={
                    isMyTeam ? 'Your current team' :
                    isTakenByOther ? `Taken by ${participant.display_name}` :
                    canSwitch ? `Click to switch to ${team.id}` : team.id
                  }
                >
                  {/* Switch hint overlay on hover */}
                  {canSwitch && !isSwitching && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-[#10B981]/10 rounded-[6px]">
                      <span className="text-[10px] font-display font-bold text-[#10B981] bg-[#090D16]/80 px-2 py-1 rounded-[4px]">
                        SWITCH
                      </span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {isMyTeam ? (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-[#10B981] text-[#090D16] uppercase tracking-wider">
                        YOU
                      </span>
                    ) : isTakenByOther ? (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 uppercase tracking-wider">
                        PICKED
                      </span>
                    ) : isAITeam ? (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/30 uppercase tracking-wider">
                        AI
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-[#86948A]/15 text-[#86948A] border border-[#1F2937] uppercase tracking-wider">
                        OPEN
                      </span>
                    )}
                    {participant?.is_host && !isMyTeam && (
                      <span className="px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 uppercase tracking-wider">
                        HOST
                      </span>
                    )}
                  </div>

                  {/* Logo */}
                  <div className="w-full flex-1 flex items-center justify-center py-2">
                    {team.logoUrl ? (
                      <img
                        src={team.logoUrl}
                        alt={team.id}
                        className={`h-14 w-auto max-w-[80%] object-contain drop-shadow ${isOpen && !isSwitching ? 'opacity-30' : ''}`}
                      />
                    ) : (
                      <div className={`text-2xl ${isOpen && !isSwitching ? 'opacity-30' : ''}`}>{team.emoji}</div>
                    )}
                  </div>

                  {/* Team Info */}
                  <div className="w-full text-center mt-1">
                    <div className="text-sm font-display font-black tracking-wide" style={{ color: team.primary }}>
                      {team.id}
                    </div>
                    <div className="text-[11px] truncate font-bold mt-0.5" style={{ 
                      color: isMyTeam ? '#10B981' : isTakenByOther ? '#DFE2EF' : '#3C4A42' 
                    }}>
                      {isSwitching ? '⟳ Switching...' :
                       isAITeam ? `🤖 ${participant.display_name}` :
                       isTakenByOther ? participant.display_name :
                       isMyTeam ? passedDisplayName :
                       'Open Slot'}
                    </div>
                    {participant && !isOpen && (
                      <div className="text-[10px] text-[#10B981] font-mono mt-0.5 font-bold">
                        {formatCr(participant.purse_remaining_lakhs)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Chat ── */}
        <GamePanel noPadding className="mb-4">
          <div className="p-3 border-b border-[#1F2937] bg-[#181B25] flex items-center justify-between">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-[#86948A] flex items-center gap-2">
              <TacticalChatIcon size={14} color="#86948A" /> Room Chat
            </span>
            <span className="text-[10px] text-[#86948A] font-mono">
              {chatMessages.length} Messages
            </span>
          </div>

          <div className="p-3 h-36 overflow-y-auto space-y-2 text-xs bg-[#0F131C]">
            {chatMessages.length === 0 && (
              <div className="text-xs text-[#86948A] italic">
                No messages yet.
              </div>
            )}
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
              placeholder="Type a message..."
              className="flex-1 bg-[#0F131C] border border-[#1F2937] rounded-[4px] px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#10B981]"
            />
            <GameButton type="submit" variant="primary" size="sm">
              SEND
            </GameButton>
          </form>
        </GamePanel>
      </div>

      {/* ── Bottom: Start / Waiting ── */}
      {isHost && (
        <div className="mt-4 pt-3 border-t border-[#1F2937] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-[#86948A]">
            {participantCount < 2 ? '⚠ Need at least 2 teams to start' : `${participantCount} teams ready — good to go!`}
          </p>
          <GameButton
            onClick={startAuction}
            variant="primary"
            size="lg"
            disabled={participantCount < 2}
            className="sm:w-auto px-8"
            icon={<PlayArrowIcon size={18} color="#090D16" />}
          >
            START AUCTION
          </GameButton>
        </div>
      )}

      {!isHost && room && (
        <div className="mt-4 pt-3 border-t border-[#1F2937] text-center text-xs text-[#86948A] flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
          <span>Awaiting host to start the auction...</span>
        </div>
      )}

      {/* ── Invite Friends Modal ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border border-[#1F2937] rounded-[8px] w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1F2937]">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#10B981]" />
                <h3 className="font-display font-extrabold text-sm text-white uppercase tracking-wider">
                  Invite Friends to Room #{code}
                </h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="w-7 h-7 rounded-[4px] bg-[#1F2937] text-[#86948A] hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {inviteStatusMsg && (
              <div className="p-2.5 rounded-[4px] bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] text-xs font-mono font-bold text-center">
                {inviteStatusMsg}
              </div>
            )}

            {!localStorage.getItem('ca26_token') ? (
              <div className="py-6 text-center space-y-2">
                <p className="text-xs text-[#86948A] font-mono">Sign in to invite your friends directly from your social list.</p>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-1.5 rounded-[4px] bg-[#10B981] text-[#090D16] font-display font-bold text-xs uppercase cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            ) : friendsLoading ? (
              <div className="py-8 text-center">
                <RefreshCw size={20} className="animate-spin text-[#10B981] mx-auto mb-2" />
                <span className="text-xs text-[#86948A] font-mono">Loading friends...</span>
              </div>
            ) : friendsList.length === 0 ? (
              <div className="py-6 text-center space-y-1">
                <p className="text-xs text-[#86948A] font-mono">No friends found.</p>
                <small className="text-[11px] text-[#6B7280] block">Add friends using their Player Tag from the Home Friends tab.</small>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {friendsList.map((f) => {
                  const isInvited = invitedMap[f.id];
                  return (
                    <div
                      key={f.id}
                      className="p-2.5 bg-[#0F131C] border border-[#1F2937] rounded-[6px] flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative">
                          <span className="text-lg">{f.avatar_emoji || '🏏'}</span>
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0F131C] ${
                              f.is_online ? 'bg-[#10B981]' : 'bg-[#4B5563]'
                            }`}
                            title={f.is_online ? 'Online' : 'Offline'}
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-display font-bold text-white block truncate">
                            {f.display_name}
                          </span>
                          <span className="text-[10px] font-mono text-[#86948A]">
                            @{f.username} {f.is_online ? '· Online' : '· Offline'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSendRoomInvite(f.id, f.display_name)}
                        disabled={isInvited}
                        className={`px-3 py-1 rounded-[4px] font-display font-bold text-xs uppercase tracking-wider transition ${
                          isInvited
                            ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 cursor-default'
                            : 'bg-[#10B981] hover:bg-[#059669] text-[#090D16] cursor-pointer'
                        }`}
                      >
                        {isInvited ? 'Invited ✓' : 'Invite'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-3 border-t border-[#1F2937] flex justify-end">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-1.5 rounded-[4px] bg-[#1F2937] hover:bg-[#374151] text-xs font-display font-bold text-white uppercase transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
