import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../lib/api';
import { getRoomSession, saveRoomSession } from '../lib/utils';

export function useAuction(roomCode: string, myFranchise?: string, myUserId?: string, isSpectator?: boolean, isManager?: boolean) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [currentFranchise, setCurrentFranchise] = useState<string | undefined>(myFranchise);
  const [isKicked, setIsKicked] = useState<boolean>(false);

  useEffect(() => {
    const token = localStorage.getItem('ca26_token');
    const savedSession = getRoomSession(roomCode || '');
    const effectivePassword = savedSession?.password;

    const newSocket = io(getSocketUrl(), {
      auth: { token }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('join_room', {
        roomCode,
        isSpectator,
        isManager,
        franchise: isManager ? undefined : (currentFranchise || myFranchise),
        userId: myUserId || savedSession?.userId || 'guest-' + Math.random().toString(36).substring(7),
        displayName: savedSession?.displayName,
        password: effectivePassword
      });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('join_handshake_success', (data) => {
      if (data.franchise) {
        setCurrentFranchise(data.franchise);
        saveRoomSession(roomCode, { ...savedSession, franchise: data.franchise });
      }
      if (data.room) {
        setRoomState((prev: any) => ({ ...prev, ...data.room }));
        if (data.room.announcements) {
          setAnnouncements(data.room.announcements);
        }
      }
      if (data.notice) {
        setError(data.notice);
        setTimeout(() => setError(null), 5000);
      }
    });

    newSocket.on('join_error', (err) => {
      setError(err.message || `Join error (${err.code || 'UNKNOWN'})`);
    });

    newSocket.on('room_cancelled', (data) => {
      setError(data.message || 'Room was cancelled by the host.');
    });

    newSocket.on('kicked_from_room', (data) => {
      setError(data.message || 'You were removed from this room by the commissioner.');
      setIsKicked(true);
    });

    newSocket.on('room_state', (state) => {
      setRoomState(state);
      if (state.announcements && state.announcements.length > 0) {
        setAnnouncements(state.announcements);
      }
      if (myUserId) {
        const mySlot = state.participants?.find((p: any) => p.user_id === myUserId);
        if (mySlot?.franchise_id && mySlot.franchise_id !== currentFranchise) {
          setCurrentFranchise(mySlot.franchise_id);
          saveRoomSession(roomCode, { ...savedSession, franchise: mySlot.franchise_id });
        }
      }
    });

    newSocket.on('bid_rejected', (data) => {
      setError(data.reason || 'Bid rejected');
      setTimeout(() => setError(null), 3000);
    });

    newSocket.on('chat_message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    newSocket.on('commissioner_announcement', (ann) => {
      setAnnouncements((prev) => [ann, ...prev.filter(a => a.id !== ann.id)].slice(0, 10));
    });

    newSocket.on('error', (err) => {
      setError(err.message || 'An error occurred');
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomCode, myFranchise, myUserId, isSpectator, isManager]);

  const activeFranchise = currentFranchise || myFranchise;

  const placeBid = useCallback((amount?: number) => {
    if (socket && roomCode && activeFranchise) {
      socket.emit('place_bid', {
        roomCode,
        franchise: activeFranchise,
        userId: myUserId,
        amount,
        idempotencyKey: `${roomCode}-${activeFranchise}-${Date.now()}`
      });
    }
  }, [socket, roomCode, activeFranchise, myUserId]);

  const hostAction = useCallback((action: 'pause' | 'resume' | 'skip' | 'mark_unsold' | 'relist_current') => {
    if (socket && roomCode && myUserId) {
      socket.emit(`host_${action}`, { roomCode, userId: myUserId });
    }
  }, [socket, roomCode, myUserId]);

  const deferCurrentPlayer = useCallback(() => {
    if (socket && roomCode && myUserId) {
      socket.emit('host_defer_current', { roomCode, userId: myUserId });
    }
  }, [socket, roomCode, myUserId]);

  const relistUnsoldPlayer = useCallback((playerId: string) => {
    if (socket && roomCode && myUserId) {
      socket.emit('host_relist_unsold_player', { roomCode, userId: myUserId, playerId });
    }
  }, [socket, roomCode, myUserId]);

  const sendAnnouncement = useCallback((message: string) => {
    if (socket && roomCode && myUserId) {
      socket.emit('host_announcement', { roomCode, userId: myUserId, message });
    }
  }, [socket, roomCode, myUserId]);

  const kickPlayer = useCallback((targetUserId: string) => {
    if (socket && roomCode && myUserId) socket.emit('host_kick_player', { roomCode, userId: myUserId, targetUserId });
  }, [socket, roomCode, myUserId]);

  const updateAuctionSettings = useCallback((bidTimerSeconds: number, isUnlimitedTimer: boolean) => {
    if (socket && roomCode && myUserId) {
      socket.emit('host_update_settings', { roomCode, userId: myUserId, bidTimerSeconds, isUnlimitedTimer });
    }
  }, [socket, roomCode, myUserId]);

  const sendChat = useCallback((message: string, sender: string) => {
    if (socket && roomCode) {
      socket.emit('send_chat', { roomCode, message, sender });
    }
  }, [socket, roomCode]);

  const hostEndAuction = useCallback((activeCardResolution?: 'sell' | 'unsold' | 'cancel') => {
    if (socket && roomCode && myUserId) {
      socket.emit('host_end_auction', { roomCode, userId: myUserId, activeCardResolution });
    }
  }, [socket, roomCode, myUserId]);

  const hostCancelRoom = useCallback(() => {
    if (socket && roomCode && myUserId) {
      socket.emit('host_cancel_room', { roomCode, userId: myUserId });
    }
  }, [socket, roomCode, myUserId]);

  return {
    socket,
    roomState,
    error,
    connected,
    chatMessages,
    announcements,
    currentFranchise: activeFranchise,
    isKicked,
    placeBid,
    hostAction,
    deferCurrentPlayer,
    relistUnsoldPlayer,
    sendAnnouncement,
    sendChat,
    kickPlayer,
    updateAuctionSettings,
    hostEndAuction,
    hostCancelRoom
  };
}

