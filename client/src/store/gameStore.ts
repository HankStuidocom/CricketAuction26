import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { Room, AuctionState, SimulationResult } from '../types';
import { playBidSound, playSoldSound, playOutbidSound, playUnsoldSound } from '../assets/sounds';

interface GameStore {
  // State
  socket: Socket | null;
  room: Room | null;
  myTeamId: string | null;
  myManagerName: string | null;
  auctionState: AuctionState | null;
  simulationResult: SimulationResult | null;
  isConnected: boolean;
  isConnecting: boolean;

  // Setters
  setRoom: (room: Room | null) => void;
  setMyTeamId: (teamId: string | null) => void;
  setMyManagerName: (name: string | null) => void;
  setAuctionState: (state: AuctionState | null) => void;
  setSimulationResult: (result: SimulationResult | null) => void;

  // Socket init
  initSocket: (serverUrl: string) => Socket;
  disconnectSocket: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // ─── Initial State ──────────────────────────────────────────────────────────
  socket: null,
  room: null,
  myTeamId: null,
  myManagerName: null,
  auctionState: null,
  simulationResult: null,
  isConnected: false,
  isConnecting: false,

  // ─── Setters ────────────────────────────────────────────────────────────────
  setRoom: (room) => set({ room }),
  setMyTeamId: (myTeamId) => set({ myTeamId }),
  setMyManagerName: (myManagerName) => set({ myManagerName }),
  setAuctionState: (auctionState) => set({ auctionState }),
  setSimulationResult: (simulationResult) => set({ simulationResult }),

  // ─── Socket Initialization ──────────────────────────────────────────────────
  initSocket: (serverUrl: string) => {
    const existing = get().socket;
    if (existing?.connected) return existing;

    set({ isConnecting: true });

    const socket = io(serverUrl, {
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    // ── Connection Events ──
    socket.on('connect', () => {
      set({ isConnected: true, isConnecting: false });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('connect_error', (err) => {
      set({ isConnecting: false });
      toast.error(`Connection error: ${err.message}`, { id: 'connect_error' });
    });

    // ── Room Events ──
    const handleRoomUpdate = (roomData: Room) => {
      set({ room: roomData });
    };
    socket.on('roomUpdated', handleRoomUpdate);
    socket.on('room:updated', handleRoomUpdate);

    socket.on('roomCreated', (data: { room: Room; teamId: string }) => {
      set({ room: data.room, myTeamId: data.teamId });
    });

    socket.on('roomJoined', (data: { room: Room; teamId: string }) => {
      set({ room: data.room, myTeamId: data.teamId });
    });

    // ── Auction Events ──
    const handleAuctionUpdate = (state: any) => {
      const prev = get().auctionState;
      if (!state) return;
      
      const newBid = state.currentBid ?? 0;
      const prevBid = prev?.currentBid ?? 0;

      // Detect new bid placed
      if (prev && newBid > prevBid) {
        playBidSound();
        if (
          prev.currentBidderId === get().myTeamId &&
          state.currentBidderId !== get().myTeamId
        ) {
          playOutbidSound();
          toast.error(`⚡ You've been outbid! Current: ₹${newBid}L`, {
            duration: 2000,
          });
        }
      }
      
      set((currentStore) => {
        const mergedState: AuctionState = {
          currentPlayer: state.currentPlayer ?? currentStore.auctionState?.currentPlayer ?? null,
          currentBid: newBid,
          currentBidderId: state.currentBidderId ?? currentStore.auctionState?.currentBidderId ?? null,
          currentBidderName: state.currentBidderName ?? currentStore.auctionState?.currentBidderName ?? null,
          phase: state.phase ?? (state.isActive ? 'BIDDING' : 'WAITING'),
          timeRemaining: state.timeRemaining ?? state.timerSeconds ?? 15,
          soldPlayers: state.soldPlayers ?? currentStore.auctionState?.soldPlayers ?? [],
          unsoldPlayers: state.unsoldPlayers ?? currentStore.auctionState?.unsoldPlayers ?? [],
          playerIndex: state.playerIndex ?? state.currentPlayerIndex ?? 0,
          totalPlayers: state.totalPlayers ?? currentStore.room?.playerPool?.length ?? 60,
          lastBidTimestamp: Date.now(),
        };
        return { auctionState: mergedState };
      });
    };

    socket.on('auctionUpdate', handleAuctionUpdate);
    socket.on('auction:playerShown', (data: any) => {
      handleAuctionUpdate({
        currentPlayer: data.player,
        currentBid: data.currentBid,
        currentBidderId: null,
        timerSeconds: data.timerSeconds,
        phase: 'PLAYER_UP',
        isActive: true,
      });
    });

    socket.on('auction:bidPlaced', (data: any) => {
      handleAuctionUpdate({
        currentBid: data.amount,
        currentBidderId: data.teamId,
        currentBidderName: data.teamName,
        phase: 'BIDDING',
        isActive: true,
      });
    });

    socket.on('auction:tick', (data: { timerSeconds: number }) => {
      set((st) => st.auctionState ? {
        auctionState: { ...st.auctionState, timeRemaining: data.timerSeconds }
      } : {});
    });

    socket.on('auction:goingOnce', (data: any) => {
      set((st) => st.auctionState ? {
        auctionState: { ...st.auctionState, phase: 'GOING_ONCE', timeRemaining: data.timerSeconds }
      } : {});
    });

    socket.on('auction:goingTwice', (data: any) => {
      set((st) => st.auctionState ? {
        auctionState: { ...st.auctionState, phase: 'GOING_TWICE', timeRemaining: data.timerSeconds }
      } : {});
    });

    const handlePlayerSold = (data: any) => {
      playSoldSound();
      const playerName = data.playerName || data.player?.name || 'Player';
      const teamName = data.teamName || 'Team';
      const price = data.price ?? data.soldPrice ?? 0;
      toast.success(`🏏 ${playerName} → ${teamName} for ₹${price}L!`, {
        duration: 4000,
        style: {
          background: '#1A2035',
          color: '#fff',
          border: '1px solid #F5A623',
        },
      });
      set((st) => st.auctionState ? {
        auctionState: { ...st.auctionState, phase: 'SOLD' }
      } : {});
    };

    socket.on('playerSold', handlePlayerSold);
    socket.on('auction:sold', handlePlayerSold);

    const handlePlayerUnsold = (data: any) => {
      playUnsoldSound();
      const playerName = data.playerName || data.player?.name || 'Player';
      toast(`❌ ${playerName} went unsold`, {
        duration: 2000,
        style: { background: '#1A2035', color: '#aaa' },
      });
      set((st) => st.auctionState ? {
        auctionState: { ...st.auctionState, phase: 'UNSOLD' }
      } : {});
    };

    socket.on('playerUnsold', handlePlayerUnsold);
    socket.on('auction:unsold', handlePlayerUnsold);

    const handleAuctionComplete = () => {
      toast.success('🎉 Auction complete! Build your squad now.', {
        duration: 5000,
        style: { background: '#1A2035', color: '#fff', border: '1px solid #1DB954' },
      });
      set((st) => st.auctionState ? {
        auctionState: { ...st.auctionState, phase: 'AUCTION_COMPLETE' }
      } : {});
    };

    socket.on('auctionComplete', handleAuctionComplete);
    socket.on('auction:complete', handleAuctionComplete);

    // ── Simulation Events ──
    const handleSimulationResult = (result: SimulationResult) => {
      set({ simulationResult: result });
    };
    socket.on('simulationResult', handleSimulationResult);
    socket.on('simulation:results', handleSimulationResult);

    // ── Error Events ──
    socket.on('error', (data: { message: string }) => {
      toast.error(data.message || 'An error occurred');
    });

    set({ socket });
    return socket;
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, room: null, auctionState: null });
    }
  },
}));
