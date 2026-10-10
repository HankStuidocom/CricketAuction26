import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { safeFetch } from '../lib/api';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import { CricketBatBallIcon, TrophyCupIcon, ShieldCrestIcon } from '../components/GameIcons';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function AuthPage({ isRegister = false }: { isRegister?: boolean }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister 
      ? { username, displayName: displayName || username, password }
      : { username, password };

    try {
      const data = await safeFetch<any>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (isRegister) {
        // Auto login after register
        const loginData = await safeFetch<any>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username, password })
        });
        if (loginData.token) {
          localStorage.setItem('ca26_token', loginData.token);
          localStorage.setItem('ca26_user', JSON.stringify(loginData.user));
          navigate('/');
        }
      } else {
        localStorage.setItem('ca26_token', data.token);
        localStorage.setItem('ca26_user', JSON.stringify(data.user));
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020814] text-[#F8FAFC] flex flex-col justify-center items-center px-4 py-8 relative font-['DM_Sans',sans-serif]">
      
      {/* Top Header with Back Navigation */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 pb-3 border-b border-white/8">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white transition"
          title="Back to Home"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#102D5E] to-[#08152E] border border-white/15 flex items-center justify-center">
            <CricketBatBallIcon size={16} color="#D9FF4D" />
          </div>
          <span className="font-['Manrope'] font-black text-lg tracking-tight">
            Crick<span className="text-[#D9FF4D]">Auction</span>
          </span>
        </div>

        <div className="w-10"></div>
      </div>

      <GamePanel glow="none" className="w-full max-w-md p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#091B3A] border border-[#D9FF4D]/30 mb-3 text-[#D9FF4D] shadow-[0_0_20px_rgba(217,255,77,0.25)]">
            <TrophyCupIcon size={28} color="#D9FF4D" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight font-['Manrope'] text-white">
            {isRegister ? 'Create Player Profile' : 'Player Sign In'}
          </h1>
          <p className="text-xs sm:text-sm text-[#8993A8] mt-1">
            {isRegister ? 'Join the IPL 2026 multiplayer auction arena' : 'Sign in to access your squad and rooms'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-xs sm:text-sm font-medium text-center flex items-center justify-center gap-2">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 font-['Manrope']">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. captain_rohit_45"
              className="w-full bg-[#050E1D] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] font-bold transition"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 font-['Manrope']">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Hitman Sharma"
                className="w-full bg-[#050E1D] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] font-bold transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2 font-['Manrope']">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#050E1D] border border-white/12 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] font-bold transition"
            />
          </div>

          <div className="pt-2">
            <GameButton
              type="submit"
              disabled={loading}
              loading={loading}
              variant="primary"
              size="lg"
              fullWidth
            >
              {isRegister ? 'CREATE ACCOUNT' : 'ENTER ARENA'}
            </GameButton>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-[#8993A8] border-t border-white/8 pt-4">
          {isRegister ? (
            <p>
              Already registered?{' '}
              <Link to="/login" className="text-[#D9FF4D] font-bold hover:underline">
                Sign in to your profile
              </Link>
            </p>
          ) : (
            <p>
              New to the auction?{' '}
              <Link to="/register" className="text-[#D9FF4D] font-bold hover:underline">
                Create a player profile
              </Link>
            </p>
          )}
        </div>
      </GamePanel>
    </div>
  );
}
