import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../lib/api';
import { getRoomSession } from '../lib/utils';

export function useAuction(roomCode: string, myFranchise?: string, myUserId?: string, isSpectator?: boolean, isManager?: boolean) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);

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
        franchise: isManager ? undefined : myFranchise,
        userId: myUserId || savedSession?.userId || 'guest-' + Math.random().toString(36).substring(7),
        displayName: savedSession?.displayName,
        password: effectivePassword
      });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('join_handshake_success', (data) => {
      if (data.room) {
        setRoomState((prev: any) => ({ ...prev, ...data.room }));
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

    newSocket.on('room_state', (state) => {
      setRoomState(state);
    });

    newSocket.on('bid_rejected', (data) => {
      setError(data.reason || 'Bid rejected');
      setTimeout(() => setError(null), 3000);
    });

    newSocket.on('chat_message', (msg) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    newSocket.on('commissioner_announcement', (ann) => {
      setAnnouncements((prev) => [ann, ...prev].slice(0, 5));
    });

    newSocket.on('error', (err) => {
      setError(err.message || 'An error occurred');
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomCode, myFranchise, myUserId, isSpectator, isManager]);

  const placeBid = useCallback((amount?: number) => {
    if (socket && roomCode && myFranchise) {
      socket.emit('place_bid', {
        roomCode,
        franchise: myFranchise,
        userId: myUserId,
        amount,
        idempotencyKey: `${roomCode}-${myFranchise}-${Date.now()}`
      });
    }
  }, [socket, roomCode, myFranchise, myUserId]);

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

  const hostEndAuction = useCallback(() => {
    if (socket && roomCode && myUserId) {
      socket.emit('host_end_auction', { roomCode, userId: myUserId });
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

