import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { playTimerTick, playUrgentTick } from '../assets/sounds';

interface AuctionTimerProps {
  timeRemaining: number;
  totalTime: number;
  isActive: boolean;
}

export default function AuctionTimer({ timeRemaining, totalTime, isActive }: AuctionTimerProps) {
  const prevTimeRef = useRef(timeRemaining);
  const [isShaking, setIsShaking] = useState(false);

  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = timeRemaining / totalTime;
  const dashOffset = circumference * (1 - progress);

  // Color states
  const isUrgent = timeRemaining <= 3;
  const isWarning = timeRemaining <= 5 && timeRemaining > 3;
  const strokeColor = isUrgent ? '#FF4444' : isWarning ? '#F97316' : '#1DB954';

  useEffect(() => {
    if (!isActive) return;
    if (timeRemaining !== prevTimeRef.current) {
      prevTimeRef.current = timeRemaining;
      if (isUrgent) {
        playUrgentTick();
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
      } else {
        playTimerTick();
      }
    }
  }, [timeRemaining, isActive, isUrgent]);

  return (
    <motion.div
      animate={isShaking ? { x: [-3, 3, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.3 }}
      className="relative flex items-center justify-center"
    >
      <svg width="110" height="110" viewBox="0 0 110 110">
        {/* Background track */}
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="8"
        />
        {/* Progress ring */}
        <circle
          cx="55"
          cy="55"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="timer-ring transition-all duration-1000 ease-linear"
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '55px 55px',
            filter: `drop-shadow(0 0 6px ${strokeColor})`,
          }}
        />
        {/* Outer glow ring when urgent */}
        {isUrgent && (
          <circle
            cx="55"
            cy="55"
            r={radius + 4}
            fill="none"
            stroke="#FF444430"
            strokeWidth="3"
          />
        )}
      </svg>

      {/* Center number */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          key={timeRemaining}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.15 }}
          className={clsx(
            'text-4xl font-black tabular-nums',
            isUrgent ? 'text-danger' : isWarning ? 'text-orange-400' : 'text-white'
          )}
          style={isUrgent ? { textShadow: '0 0 15px #FF4444' } : undefined}
        >
          {timeRemaining}
        </motion.div>
      </div>

      {/* Pulse ring when urgent */}
      {isUrgent && isActive && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-danger/50"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
        />
      )}
    </motion.div>
  );
}
