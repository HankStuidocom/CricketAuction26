import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { safeFetch } from '../lib/api';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import { CricketBatBallIcon, TrophyCupIcon } from '../components/GameIcons';
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
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] flex flex-col justify-center items-center px-4 py-8 relative font-sans">
      
      {/* Top Header with Back Navigation */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 pb-3 border-b border-[#1F2937]">
        <button
          onClick={() => navigate('/')}
          className="w-9 h-9 rounded-[6px] bg-[#111827] border border-[#1F2937] flex items-center justify-center text-[#86948A] hover:text-[#DFE2EF] hover:border-[#10B981] transition"
          title="Back to Home"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[6px] bg-[#111827] border border-[#1F2937] flex items-center justify-center shadow-inner">
            <CricketBatBallIcon size={16} color="#10B981" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white">
            CRICK<span className="text-[#10B981]">AUCTION</span>
          </span>
          <span className="text-[10px] font-mono font-bold text-[#86948A] bg-[#1C1F29] px-1.5 py-0.5 rounded-[4px] border border-[#1F2937]">
            AUTH
          </span>
        </div>

        <div className="w-9"></div>
      </div>

      <GamePanel glow="none" className="w-full max-w-md p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-[6px] bg-[#1C1F29] border border-[#10B981]/40 mb-3 text-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.25)]">
            <TrophyCupIcon size={26} color="#10B981" />
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white uppercase">
            {isRegister ? 'Create Player Profile' : 'Commander Access'}
          </h1>
          <p className="text-xs text-[#86948A] mt-1">
            {isRegister ? 'Register your profile for IPL 2026 multiplayer arena draft' : 'Sign in to access your squad roster and tactical arena'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#FFB4AB] rounded-[6px] text-xs font-medium text-center flex items-center justify-center gap-2">
            <AlertCircle size={15} className="text-[#EF4444] flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-1.5">
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. captain_rohit_45"
              className="w-full bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-3.5 py-2.5 text-sm text-[#DFE2EF] focus:outline-none focus:border-[#10B981] font-display font-bold transition"
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-1.5">
                Display Gamer Tag
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Hitman Sharma"
                className="w-full bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-3.5 py-2.5 text-sm text-[#DFE2EF] focus:outline-none focus:border-[#10B981] font-display font-bold transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-display font-bold uppercase tracking-wider text-[#86948A] mb-1.5">
              Secret Passkey
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0F131C] border border-[#1F2937] rounded-[6px] px-3.5 py-2.5 text-sm text-[#DFE2EF] focus:outline-none focus:border-[#10B981] font-mono font-bold transition"
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
              {isRegister ? 'INITIALIZE PROFILE' : 'ENTER COMMAND ARENA'}
            </GameButton>
          </div>
        </form>

        <div className="mt-6 text-center text-xs text-[#86948A] border-t border-[#1F2937] pt-4">
          {isRegister ? (
            <p>
              Already registered?{' '}
              <Link to="/login" className="text-[#10B981] font-bold hover:underline">
                Sign in to your profile
              </Link>
            </p>
          ) : (
            <p>
              New commander?{' '}
              <Link to="/register" className="text-[#10B981] font-bold hover:underline">
                Create a player profile
              </Link>
            </p>
          )}
        </div>
      </GamePanel>
    </div>
  );
}
