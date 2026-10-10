import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { safeFetch } from '../lib/api';
import { Trophy, Shield, KeyRound, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col justify-center items-center px-4 pitch-bg">
      <div className="w-full max-w-md bg-[#111318] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 sm:p-8 shadow-2xl relative">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-[#181B21] border border-[rgba(255,255,255,0.08)] mb-4 text-[#B6FF3B]">
            <Trophy size={32} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {isRegister ? 'Create Player Account' : 'Welcome Back'}
          </h1>
          <p className="text-sm text-[#A3A7B0] mt-1">
            {isRegister ? 'Join the IPL 2026 multiplayer auction arena' : 'Sign in to access your squad and rooms'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A7B0] mb-2">
              Username
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. virat_fan_18"
                className="w-full bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#B6FF3B] transition"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A7B0] mb-2">
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Captain VK"
                className="w-full bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#B6FF3B] transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#A3A7B0] mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#181B21] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#B6FF3B] transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 bg-[#B6FF3B] hover:bg-[#a3f024] text-black font-extrabold text-sm rounded-xl transition shadow-[0_0_20px_rgba(182,255,59,0.3)] disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isRegister ? 'CREATE ACCOUNT' : 'SIGN IN')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[#A3A7B0]">
          {isRegister ? (
            <p>
              Already have an account?{' '}
              <Link to="/login" className="text-[#B6FF3B] font-bold hover:underline">
                Sign in
              </Link>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="text-[#B6FF3B] font-bold hover:underline">
                Register now
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
