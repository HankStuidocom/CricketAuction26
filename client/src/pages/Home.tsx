import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Key, ChevronRight, Trophy, Users, Clock, Star } from 'lucide-react';
import { IPL_TEAMS } from '../utils/constants';
import { useSocket } from '../hooks/useSocket';

// Animated background particle
function Particle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full bg-gold/20"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
      animate={{
        y: [0, -30, 0],
        opacity: [0.2, 0.6, 0.2],
        scale: [1, 1.2, 1],
      }}
      transition={{ repeat: Infinity, duration: 3 + delay, delay, ease: 'easeInOut' }}
    />
  );
}

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 4 + Math.random() * 12,
  delay: Math.random() * 3,
}));

const HOW_TO_STEPS = [
  { icon: '🏠', step: '01', title: 'Create Room', desc: 'Set up your auction room with custom settings — purse size, timer, player pool.' },
  { icon: '🎯', step: '02', title: 'Pick Your Team', desc: 'Choose from all 10 IPL franchises. Be the manager of your dream team.' },
  { icon: '💰', step: '03', title: 'Bid Hard', desc: 'Compete in real-time bidding against friends and AI. Every second counts!' },
  { icon: '🏆', step: '04', title: 'Win the IPL', desc: 'Build the best squad, field your XI, and watch the T20 simulation unfold.' },
];

export default function Home() {
  const navigate = useNavigate();
  useSocket(); // initialize connection

  return (
    <div className="min-h-screen bg-navy overflow-hidden">
      {/* ── Hero Section ──────────────────────────────────────────────────────── */}
      <div className="relative min-h-screen flex flex-col items-center justify-center pt-16 px-4">
        {/* Animated particle background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {PARTICLES.map(p => (
            <Particle key={p.id} {...p} />
          ))}
          {/* Cricket field circle */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <div className="w-[600px] h-[600px] rounded-full border-[40px] border-cricket-green" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center opacity-5">
            <div className="w-[300px] h-[300px] rounded-full border-[20px] border-cricket-green" />
          </div>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-navy/50 via-transparent to-navy" />
        </div>

        {/* Hero content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative text-center max-w-4xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-7xl mb-6"
          >
            🏏
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-5xl sm:text-7xl font-black mb-4 leading-none tracking-tight"
          >
            <span className="text-gold" style={{ textShadow: '0 0 40px rgba(245,166,35,0.5)' }}>
              CRICKET
            </span>
            <br />
            <span className="text-white">AUCTION</span>
            <span className="text-cricket-green ml-3">26</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg sm:text-xl text-white/70 mb-10 max-w-2xl mx-auto"
          >
            Build your IPL dream squad. Bid. Win. Dominate.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/create')}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-lg text-navy shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #F5A623, #FFD700)',
                boxShadow: '0 0 30px rgba(245,166,35,0.4)',
              }}
            >
              <Zap size={22} />
              🏏 CREATE AUCTION
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/join')}
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-lg text-white border-2 border-white/30 hover:border-gold/60 backdrop-blur-sm"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              <Key size={22} />
              🔑 JOIN AUCTION
            </motion.button>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex justify-center gap-8 mt-12 text-center"
          >
            {[
              { icon: <Users size={16} />, label: '10 IPL Teams' },
              { icon: <Clock size={16} />, label: 'Real-time Auction' },
              { icon: <Trophy size={16} />, label: 'T20 Simulation' },
              { icon: <Star size={16} />, label: '60+ Players' },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-1 text-white/50">
                <div className="text-gold">{item.icon}</div>
                <span className="text-xs font-medium hidden sm:block">{item.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* ── How to Play ───────────────────────────────────────────────────────── */}
      <section className="px-4 py-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-black text-white mb-2">HOW TO PLAY</h2>
          <p className="text-white/50">Four steps to IPL glory</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_TO_STEPS.map((step, idx) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="relative card flex flex-col items-center text-center gap-3 p-6 hover:border-gold/30 transition-all"
            >
              <div className="text-4xl">{step.icon}</div>
              <div className="text-gold font-black text-xs tracking-widest">STEP {step.step}</div>
              <h3 className="font-black text-white text-lg">{step.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed">{step.desc}</p>
              {idx < HOW_TO_STEPS.length - 1 && (
                <ChevronRight
                  className="absolute -right-3 top-1/2 -translate-y-1/2 text-gold/30 hidden lg:block"
                  size={24}
                />
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── IPL Teams Showcase ────────────────────────────────────────────────── */}
      <section className="px-4 py-16 bg-card/30 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl font-black text-white mb-1">ALL 10 IPL FRANCHISES</h2>
            <p className="text-white/40 text-sm">Pick your franchise and become the ultimate auction manager</p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-3">
            {IPL_TEAMS.map((team, idx) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.1, y: -4 }}
                className="flex flex-col items-center gap-2 cursor-pointer"
                onClick={() => navigate('/create')}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center font-black text-white text-sm shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${team.color}, ${team.secondaryColor})`,
                    boxShadow: `0 4px 20px ${team.color}50`,
                  }}
                >
                  {team.abbr}
                </div>
                <span className="text-white/50 text-[10px] text-center max-w-[60px] leading-tight">
                  {team.abbr}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="text-center py-10 text-white/30 text-sm">
        <div className="text-2xl mb-2">🏏</div>
        <p>Made for IPL Fans — Cricket Auction 26</p>
        <p className="mt-1 text-xs">Real-time multiplayer cricket auction game</p>
      </footer>
    </div>
  );
}
