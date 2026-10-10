import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketUrl } from '../lib/api';

export function useAuction(roomCode: string, myFranchise?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomState, setRoomState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('ca26_token');
    const newSocket = io(getSocketUrl(), {
      auth: { token }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('join_room', { roomCode, franchise: myFranchise });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
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

    newSocket.on('error', (err) => {
      setError(err.message || 'An error occurred');
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomCode, myFranchise]);

  const placeBid = useCallback((amount?: number) => {
    if (socket && roomCode && myFranchise) {
      socket.emit('place_bid', {
        roomCode,
        franchise: myFranchise,
        amount,
        idempotencyKey: `${roomCode}-${myFranchise}-${Date.now()}`
      });
    }
  }, [socket, roomCode, myFranchise]);

  const hostAction = useCallback((action: 'pause' | 'resume' | 'skip' | 'mark_unsold') => {
    if (socket && roomCode) {
      socket.emit(`host_${action}`, { roomCode });
    }
  }, [socket, roomCode]);

  const sendChat = useCallback((message: string, sender: string) => {
    if (socket && roomCode) {
      socket.emit('send_chat', { roomCode, message, sender });
    }
  }, [socket, roomCode]);

  return {
    socket,
    roomState,
    error,
    connected,
    chatMessages,
    placeBid,
    hostAction,
    sendChat
  };
}
