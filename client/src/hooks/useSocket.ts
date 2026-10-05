import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { SERVER_URL } from '../utils/constants';

export function useSocket() {
  const { socket, isConnected, isConnecting, initSocket } = useGameStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized) {
      initSocket(SERVER_URL);
      setInitialized(true);
    }
  }, [initialized, initSocket]);

  return {
    socket,
    isConnected,
    isConnecting,
  };
}
