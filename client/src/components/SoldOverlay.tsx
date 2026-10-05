import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SoldRecord } from '../types';
import { formatPoints } from '../utils/formatting';
import { getTeamColor } from '../utils/formatting';

interface SoldOverlayProps {
  soldRecord: SoldRecord | null;
  onComplete: () => void;
}

// Confetti piece colors
const CONFETTI_COLORS = ['#F5A623', '#1DB954', '#60A5FA', '#EC4899', '#8B5CF6', '#FBBF24'];

function ConfettiPiece({ delay, x, color }: { delay: number; x: number; color: string }) {
  return (
    <motion.div
      initial={{ y: -20, x, opacity: 1, rotate: 0, scale: 1 }}
      animate={{ y: '110vh', x: x + (Math.random() - 0.5) * 200, opacity: 0, rotate: 720, scale: 0.5 }}
      transition={{ duration: 3, delay, ease: 'linear' }}
      className="absolute top-0 w-3 h-3 rounded-sm pointer-events-none"
      style={{ backgroundColor: color, left: `${x}%` }}
    />
  );
}

export default function SoldOverlay({ soldRecord, onComplete }: SoldOverlayProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; delay: number; color: string }>>([]);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (soldRecord) {
      setShow(true);
      // Generate confetti
      const pieces = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 1.5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      }));
      setConfetti(pieces);

      // Auto-dismiss
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onComplete, 400);
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [soldRecord, onComplete]);

  const teamColor = soldRecord ? getTeamColor(soldRecord.teamId) : '#F5A623';

  return (
    <AnimatePresence>
      {show && soldRecord && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(0,0,0,0.85)' }}
        >
          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden">
            {confetti.map(p => (
              <ConfettiPiece key={p.id} x={p.x} delay={p.delay} color={p.color} />
            ))}
          </div>

          {/* Main content */}
          <div className="relative text-center px-8 py-12 rounded-3xl border-2 border-gold/40 bg-navy/90 backdrop-blur-xl max-w-lg w-full mx-4 sold-text">
            {/* SOLD stamp */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: -5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.2 }}
              className="inline-block mb-4"
            >
              <div className="text-6xl font-black text-gold border-4 border-gold px-6 py-2 rounded-xl tracking-widest"
                style={{ textShadow: '0 0 30px #F5A623' }}>
                SOLD!
              </div>
            </motion.div>

            {/* Player name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-3xl font-black text-white mb-2"
            >
              {soldRecord.player.name}
            </motion.div>

            {/* TO banner */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-white/50 text-sm mb-3 uppercase tracking-widest"
            >
              sold to
            </motion.div>

            {/* Team name */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
              className="text-2xl font-black mb-1"
              style={{ color: teamColor }}
            >
              {soldRecord.teamName}
            </motion.div>

            {/* Price */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="text-5xl font-black text-gold mt-3"
              style={{ textShadow: '0 0 20px #F5A623' }}
            >
              {formatPoints(soldRecord.price)}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
