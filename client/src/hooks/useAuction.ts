import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { GameTeam } from '../types';

export function useAuction() {
  const { socket, room, myTeamId, auctionState } = useGameStore();

  // Compute my team from room
  const myTeam: GameTeam | undefined = room?.teams.find(t => t.id === myTeamId);

  // Compute if I can bid right now
  const canBid = (() => {
    if (!auctionState || !myTeam || !room) return false;
    if (auctionState.phase !== 'BIDDING' && auctionState.phase !== 'PLAYER_UP') return false;
    if (myTeam.isEliminated) return false;
    const nextBid = auctionState.currentBid + 10;
    if (myTeam.purse < nextBid) return false;
    return true;
  })();

  // Am I currently winning the bid?
  const isWinning = myTeamId !== null && auctionState?.currentBidderId === myTeamId;

  // Place a bid
  const placeBid = useCallback(
    (amount: number) => {
      if (!socket || !room) return;
      socket.emit('placeBid', { roomCode: room.code, amount });
    },
    [socket, room]
  );

  // Current bid amount
  const currentBid = auctionState?.currentBid ?? 0;

  // Minimum next bid
  const minNextBid = currentBid + 10;

  return {
    auctionState,
    myTeam,
    canBid,
    isWinning,
    placeBid,
    currentBid,
    minNextBid,
  };
}
