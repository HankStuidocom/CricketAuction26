import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { safeFetch } from '../lib/api';
import { Trophy, Shield, KeyRound, Sparkles, ArrowLeft } from 'lucide-react';

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
      const data = await safeFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (isRegister) {
        // Auto login after register
        const loginData = await safeFetch('/api/auth/login', {
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
    <div className="min-h-screen bg-gradient-to-b from-[#05172E] via-[#020B18] to-[#020A16] text-[#F5F7FF] flex flex-col justify-center items-center px-4 py-8 relative font-['DM_Sans',sans-serif]">
      {/* Top Header with Back Navigation */}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white transition"
          title="Back to Home"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex items-center gap-2">
          <i className="brand-mark"></i>
          <span className="font-extrabold text-lg tracking-tight font-['Manrope']">
            Crick<span className="text-[#D9FF4D]">Auction</span>
          </span>
        </div>

        <div className="w-10"></div>
      </div>

      <div className="w-full max-w-md bg-[#0B1730] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-[#061224] border border-white/10 mb-3 text-[#D9FF4D]">
            <Trophy size={28} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-['Manrope'] text-white">
            {isRegister ? 'Create Player Account' : 'Welcome Back'}
          </h1>
          <p className="text-xs sm:text-sm text-[#8993A8] mt-1">
            {isRegister ? 'Join the IPL 2026 multiplayer auction arena' : 'Sign in to access your squad and rooms'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs sm:text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. virat_fan_18"
                className="w-full bg-[#061224] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] transition"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Captain VK"
                className="w-full bg-[#061224] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8993A8] mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#061224] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#D9FF4D] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-[#D9FF4D] hover:bg-[#c7f035] text-[#07111E] font-black text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_20px_rgba(217,255,77,0.3)] disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isRegister ? 'CREATE ACCOUNT' : 'SIGN IN')}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#8993A8]">
          {isRegister ? (
            <p>
              Already have an account?{' '}
              <Link to="/login" className="text-[#D9FF4D] font-bold hover:underline">
                Sign in
              </Link>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="text-[#D9FF4D] font-bold hover:underline">
                Register now
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
