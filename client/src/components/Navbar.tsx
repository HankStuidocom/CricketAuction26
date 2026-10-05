import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { toggleMute } from '../assets/sounds';
import clsx from 'clsx';

export default function Navbar() {
  const { isConnected, room } = useGameStore();
  const location = useLocation();
  const [muted, setMuted] = useState(false);
  const isHome = location.pathname === '/';

  const handleMute = () => {
    const nowMuted = toggleMute();
    setMuted(nowMuted);
  };

  return (
    <motion.nav
      initial={{ y: -60 }}
      animate={{ y: 0 }}
      className={clsx(
        'fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3',
        'bg-navy/80 backdrop-blur-xl border-b border-white/10',
        isHome && 'bg-transparent border-transparent'
      )}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 group">
        <span className="text-2xl">🏏</span>
        <span className="font-black text-lg tracking-tight">
          <span className="text-gold">CRICKET</span>
          <span className="text-white"> AUCTION</span>
          <span className="text-cricket-green"> 26</span>
        </span>
      </Link>

      {/* Center — room code if in game */}
      {room && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2"
        >
          <span className="text-white/50 text-sm">ROOM</span>
          <span className="font-mono font-black text-gold text-lg tracking-widest bg-gold/10 px-3 py-1 rounded-lg border border-gold/30">
            {room.code}
          </span>
        </motion.div>
      )}

      {/* Right — status + links */}
      <div className="flex items-center gap-3">
        {/* Player database link */}
        <Link
          to="/players"
          className="text-white/60 hover:text-white text-sm font-medium transition-colors hidden sm:block"
        >
          Players
        </Link>

        {/* Mute button */}
        <button
          onClick={handleMute}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white"
          title={muted ? 'Unmute' : 'Mute'}
        >
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* Connection status */}
        <div className={clsx(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium',
          isConnected
            ? 'bg-cricket-green/15 text-cricket-green'
            : 'bg-red-500/15 text-red-400'
        )}>
          {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span className="hidden sm:inline">{isConnected ? 'Live' : 'Offline'}</span>
        </div>
      </div>
    </motion.nav>
  );
}
