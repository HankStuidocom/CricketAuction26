import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ALL_FRANCHISES, 
  FRANCHISE_MAP, 
  formatCr 
} from '../lib/utils';
import { safeFetch } from '../lib/api';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import { RoleBadge, StatusOriginBadge, PointsBadge, LivePill } from '../components/GameBadge';
import { 
  CricketBatBallIcon, 
  GavelIcon, 
  TimerGaugeIcon, 
  PurseCoinsIcon, 
  TrophyCupIcon, 
  CrownHostIcon, 
  ShieldCrestIcon, 
  BotsAiIcon, 
  ShareInviteIcon, 
  CheckmarkIcon,
  TacticalChatIcon
} from '../components/GameIcons';
import { 
  Search, Users, User, ArrowLeft, RefreshCw, 
  ChevronRight, LogIn, LogOut, Flame, ExternalLink 
} from 'lucide-react';

type TabType = 'home' | 'matches' | 'play' | 'friends' | 'profile';

export default function Home() {
  const navigate = useNavigate();
  
  // Navigation & Screen state
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [splashVisible, setSplashVisible] = useState(() => {
    return !sessionStorage.getItem('ca26_splash_seen');
  });
  const [splashReady, setSplashReady] = useState(false);
  const [connectionText, setConnectionText] = useState('Connecting to auction server...');

  // Data state
  const [user, setUser] = useState<any>(null);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [serverOnline, setServerOnline] = useState(false);

  // Check backend health & user on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ca26_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}

    // Ping server health
    safeFetch('/api/health')
      .then(() => {
        setServerOnline(true);
        setConnectionText('Connection secured. Stadium live.');
        setSplashReady(true);
      })
      .catch(() => {
        setConnectionText('Connected in local arena mode.');
        setSplashReady(true);
      });

    // Auto-advance splash after 2.2 seconds if server is ready
    const timer = setTimeout(() => {
      setSplashReady(true);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  // Fetch public rooms when matches tab is active
  useEffect(() => {
    if (activeTab === 'matches' || activeTab === 'home') {
      fetchRooms();
    }
  }, [activeTab]);

  const fetchRooms = async () => {
    setRoomsLoading(true);
    try {
      const rooms = await safeFetch<any[]>('/api/rooms');
      setPublicRooms(Array.isArray(rooms) ? rooms : []);
    } catch {
      setPublicRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  };

  const handleStartFromSplash = () => {
    setSplashVisible(false);
    sessionStorage.setItem('ca26_splash_seen', 'true');
  };

  const handleCopyShare = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSignOut = () => {
    localStorage.removeItem('ca26_token');
    localStorage.removeItem('ca26_user');
    setUser(null);
  };

  // Matches tab subfilter ('live' | 'upcoming' | 'finished')
  const [matchesFilter, setMatchesFilter] = useState<'live' | 'upcoming' | 'finished'>('live');

  // Spotlight broadcast ticker
  const [spotlightSeconds, setSpotlightSeconds] = useState(12);
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const SPOTLIGHT_PLAYERS = [
    { name: 'Virat Kohli', role: 'Batter', points: 15, base: '₹2.00 Cr', bid: '18.5', team1: 'CSK', team2: 'RCB', round: 'ROUND 3' },
    { name: 'Rohit Sharma', role: 'Batter', points: 15, base: '₹2.00 Cr', bid: '21.0', team1: 'MI', team2: 'DC', round: 'ROUND 2' },
    { name: 'Jasprit Bumrah', role: 'Bowler', points: 15, base: '₹2.00 Cr', bid: '22.5', team1: 'MI', team2: 'KKR', round: 'ROUND 4' },
    { name: 'MS Dhoni', role: 'Wicket-Keeper', points: 13, base: '₹2.00 Cr', bid: '16.5', team1: 'CSK', team2: 'SRH', round: 'ROUND 1' },
    { name: 'Hardik Pandya', role: 'All-Rounder', points: 14, base: '₹2.00 Cr', bid: '19.25', team1: 'GT', team2: 'MI', round: 'ROUND 3' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setSpotlightSeconds(prev => {
        if (prev <= 1) {
          setSpotlightIndex(idx => (idx + 1) % SPOTLIGHT_PLAYERS.length);
          return 14;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Featured live card details
  const featuredRoom = publicRooms[0];
  const currentSpotlight = SPOTLIGHT_PLAYERS[spotlightIndex];
  const featuredHost = featuredRoom?.host_franchise || currentSpotlight.team1;
  const featuredOpponent = featuredRoom ? (featuredHost === 'CSK' ? 'MI' : 'CSK') : currentSpotlight.team2;
  const featuredBid = featuredRoom ? '18.5' : currentSpotlight.bid;

  return (
    <div className="min-h-screen bg-[#020814] text-[#F8FAFC] font-['DM_Sans',sans-serif] relative overflow-x-hidden select-none">
      
      {/* 1. Animated Cricket Splash Screen */}
      {splashVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-radial from-[#091D3E] via-[#040C1B] to-[#01040A] transition-opacity duration-500">
          <div className="text-center w-full max-w-xs animate-fade-up">
            
            {/* Spinning Cricket Ball */}
            <div className="cricket-ball mb-6 cursor-pointer" onClick={handleStartFromSplash} title="Click to start"></div>
            
            <h1 className="text-3xl font-black tracking-tight font-['Manrope'] mb-2">
              CRICK<span className="text-[#D9FF4D]">·</span>AUCTION
            </h1>
            <p className="text-[11px] text-[#8993A8] mb-5 tracking-widest uppercase font-bold">
              IPL 2026 MULTIPLAYER ARENA
            </p>

            <div className="mb-4">
              <p className="text-xs text-[#D9FF4D] font-bold mb-3 flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D9FF4D] animate-ping"></span>
                {connectionText}
              </p>
              
              {!splashReady ? (
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden w-48 mx-auto">
                  <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#D9FF4D] w-full animate-pulse"></div>
                </div>
              ) : (
                <GameButton
                  onClick={handleStartFromSplash}
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="shadow-[0_0_30px_rgba(217,255,77,0.4)]"
                >
                  ENTER THE ARENA
                </GameButton>
              )}
            </div>

            <button
              onClick={handleStartFromSplash}
              className="text-[11px] text-[#8993A8] hover:text-white transition mt-2 underline"
            >
              Skip intro
            </button>
          </div>
        </div>
      )}

      {/* Main Container - App Shell */}
      <div className="max-w-md md:max-w-xl mx-auto min-h-screen relative flex flex-col pb-28 px-4 pt-3">
        
        {/* Top Header - Only on Home tab */}
        {activeTab === 'home' && (
          <header className="flex justify-between items-center py-3 mb-3 border-b border-white/8">
            {/* Brand Logo & Mark */}
            <div 
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#102D5E] to-[#08152E] border border-white/15 flex items-center justify-center shadow-md group-hover:border-[#D9FF4D]/50 transition">
                <CricketBatBallIcon size={18} color="#D9FF4D" />
              </div>
              <div>
                <span className="font-black text-xl tracking-tight font-['Manrope'] leading-none block">
                  Crick<span className="text-[#D9FF4D]">Auction</span>
                </span>
                <span className="text-[9px] font-extrabold tracking-widest text-[#8993A8] uppercase block mt-0.5">
                  IPL 2026 EDITION
                </span>
              </div>
            </div>

            {/* Quick Header Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('matches')}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition flex items-center justify-center text-[#8993A8] hover:text-white relative"
                title="Search Matches"
              >
                <Search size={18} />
                {publicRooms.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF344C] animate-pulse"></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('friends')}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition flex items-center justify-center text-[#8993A8] hover:text-white relative"
                title="Friends & Crew"
              >
                <Users size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#D9FF4D]"></span>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition flex items-center justify-center text-[#8993A8] hover:text-white"
                title="Profile"
              >
                <User size={18} />
              </button>
            </div>
          </header>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 1: HOME DASHBOARD                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-fade-up">
            
            {/* Sub-tab Pill Navigation */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs font-bold text-[#8993A8]">
              <button 
                onClick={() => setActiveTab('home')}
                className="pb-2 border-b-2 border-[#D9FF4D] text-white flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9FF4D]"></span>
                Live Spotlight
              </button>
              <button 
                onClick={() => setActiveTab('matches')}
                className="pb-2 hover:text-white transition flex items-center gap-1"
              >
                Arenas ({publicRooms.length})
              </button>
              <button 
                onClick={() => setActiveTab('play')}
                className="pb-2 hover:text-[#D9FF4D] transition text-[#D9FF4D]/90 flex items-center gap-1"
              >
                ＋ Host Arena
              </button>
            </div>

            {/* Hero Live Spotlight Card */}
            <div className="relative rounded-2xl p-4 bg-gradient-to-br from-[#0F224A] via-[#09152E] to-[#040C1A] border border-white/15 overflow-hidden shadow-2xl">
              <div className="live-grid-pattern"></div>
              
              {/* Header inside Card */}
              <div className="relative z-10 flex justify-between items-center text-[10px] text-[#BDC7DA] mb-3">
                <LivePill label="BROADCAST" />
                <span className="font-mono font-bold tracking-wider text-[#A8B3C6]">
                  {currentSpotlight.round}
                </span>
              </div>

              {/* Matchup Layout */}
              <div className="relative z-10 grid grid-cols-3 items-center text-center py-2">
                {/* Team A */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 mb-1.5 shadow-md">
                    {FRANCHISE_MAP[featuredHost]?.logoUrl ? (
                      <img src={FRANCHISE_MAP[featuredHost].logoUrl} alt={featuredHost} className="max-h-full object-contain drop-shadow" />
                    ) : (
                      <span className="text-2xl">{FRANCHISE_MAP[featuredHost]?.emoji || '🦁'}</span>
                    )}
                  </div>
                  <b className="text-xs font-black" style={{ color: FRANCHISE_MAP[featuredHost]?.primary }}>
                    {FRANCHISE_MAP[featuredHost]?.name.split(' ')[0]}
                  </b>
                  <span className="text-[9px] text-[#8993A8] font-bold">142 PTS</span>
                </div>

                {/* Score & Bid */}
                <div className="flex flex-col items-center">
                  <div className="text-[10px] font-extrabold text-[#8993A8] tracking-widest uppercase mb-0.5">
                    HIGH BID
                  </div>
                  <div className="font-['Manrope'] font-black text-2xl sm:text-3xl tracking-tight text-white flex items-baseline justify-center">
                    ₹{featuredBid}<span className="text-sm text-[#D9FF4D] ml-0.5 font-sans">Cr</span>
                  </div>
                  <span className="text-[9px] font-bold text-[#D9FF4D] bg-[#D9FF4D]/10 px-2 py-0.5 rounded-full mt-1">
                    {featuredHost} LEADING
                  </span>
                </div>

                {/* Team B */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-1.5 mb-1.5 shadow-md">
                    {FRANCHISE_MAP[featuredOpponent]?.logoUrl ? (
                      <img src={FRANCHISE_MAP[featuredOpponent].logoUrl} alt={featuredOpponent} className="max-h-full object-contain drop-shadow" />
                    ) : (
                      <span className="text-2xl">{FRANCHISE_MAP[featuredOpponent]?.emoji || '🏏'}</span>
                    )}
                  </div>
                  <b className="text-xs font-black" style={{ color: FRANCHISE_MAP[featuredOpponent]?.primary }}>
                    {FRANCHISE_MAP[featuredOpponent]?.name.split(' ')[0]}
                  </b>
                  <span className="text-[9px] text-[#8993A8] font-bold">136 PTS</span>
                </div>
              </div>

              {/* Player ticker & timer */}
              <div className="relative z-10 text-center text-[11px] text-[#A9B7D1] pt-3 border-t border-white/8 mt-2 flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[9px] text-[#8993A8] uppercase font-bold block">On The Block</span>
                  <b className="text-white font-black">{currentSpotlight.name}</b>
                  <span className="text-[10px] text-[#D9FF4D] ml-1">({currentSpotlight.role})</span>
                </div>

                <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-xl border border-white/10">
                  <TimerGaugeIcon size={13} color="#D9FF4D" />
                  <span className="font-mono font-black text-[#D9FF4D] text-xs">
                    00:{spotlightSeconds < 10 ? `0${spotlightSeconds}` : spotlightSeconds}
                  </span>
                </div>
              </div>

              {/* Quick Enter CTA */}
              <div className="mt-3.5">
                {featuredRoom ? (
                  <GameButton
                    onClick={() => navigate(`/room/${featuredRoom.room_code}`)}
                    variant="primary"
                    size="md"
                    fullWidth
                    icon={<GavelIcon size={14} color="#051120" />}
                  >
                    JOIN ROOM #{featuredRoom.room_code}
                  </GameButton>
                ) : (
                  <GameButton
                    onClick={() => setActiveTab('play')}
                    variant="primary"
                    size="md"
                    fullWidth
                    icon={<GavelIcon size={14} color="#051120" />}
                  >
                    HOST YOUR OWN AUCTION
                  </GameButton>
                )}
              </div>
            </div>

            {/* Quick Action Game Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div 
                onClick={() => navigate('/create')}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0F2648] to-[#071329] border border-[#D9FF4D]/30 hover:border-[#D9FF4D] transition cursor-pointer group shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-[#D9FF4D]/15 text-[#D9FF4D] flex items-center justify-center mb-2 group-hover:scale-105 transition">
                  <GavelIcon size={20} color="#D9FF4D" />
                </div>
                <h4 className="font-['Manrope'] font-black text-sm text-white flex items-center justify-between">
                  Host Arena <ChevronRight size={14} className="text-[#D9FF4D]" />
                </h4>
                <p className="text-[10px] text-[#8993A8] mt-0.5">
                  Create room with custom purse & bots
                </p>
              </div>

              <div 
                onClick={() => navigate('/join')}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-[#0C1E3C] to-[#061022] border border-[#00E5FF]/30 hover:border-[#00E5FF] transition cursor-pointer group shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/15 text-[#00E5FF] flex items-center justify-center mb-2 group-hover:scale-105 transition">
                  <ShieldCrestIcon size={20} color="#00E5FF" />
                </div>
                <h4 className="font-['Manrope'] font-black text-sm text-white flex items-center justify-between">
                  Join Room <ChevronRight size={14} className="text-[#00E5FF]" />
                </h4>
                <p className="text-[10px] text-[#8993A8] mt-0.5">
                  Enter 6-digit code or browse arenas
                </p>
              </div>
            </div>

            {/* Section: Live Public Rooms Preview */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h3 className="font-['Manrope'] font-extrabold text-xs uppercase tracking-wider text-[#8993A8] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D9FF4D]"></span>
                  Active Public Arenas ({publicRooms.length})
                </h3>
                <button
                  onClick={() => setActiveTab('matches')}
                  className="text-xs font-bold text-[#D9FF4D] hover:underline"
                >
                  View All ›
                </button>
              </div>

              {publicRooms.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#081124] border border-white/10 text-center">
                  <p className="text-xs text-[#8993A8] mb-2.5">No open public rooms active right now.</p>
                  <GameButton
                    onClick={() => navigate('/create')}
                    variant="glass"
                    size="sm"
                  >
                    Create the First Room
                  </GameButton>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {publicRooms.slice(0, 2).map((r: any) => (
                    <div 
                      key={r.room_code}
                      className="p-3 rounded-2xl bg-gradient-to-r from-[#0A162E] to-[#060F20] border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                          <img 
                            src={FRANCHISE_MAP[r.host_franchise || 'CSK']?.logoUrl} 
                            alt="Team" 
                            className="max-h-full object-contain p-1" 
                          />
                        </div>
                        <div>
                          <div className="font-['Manrope'] font-black text-xs text-white">
                            ROOM #{r.room_code}
                          </div>
                          <div className="text-[10px] text-[#8993A8]">
                            Purse: <span className="text-white font-bold">{formatCr(r.starting_purse_lakhs || 12000)}</span> · {r.max_teams || 10} Teams
                          </div>
                        </div>
                      </div>

                      <GameButton
                        onClick={() => navigate(`/room/${r.room_code}`)}
                        variant="primary"
                        size="sm"
                      >
                        JOIN
                      </GameButton>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Franchise Strip */}
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#8993A8] mb-2 flex items-center justify-between">
                <span>IPL 2026 Franchises</span>
                <span className="text-[9px]">10 Teams</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {ALL_FRANCHISES.map(f => (
                  <div 
                    key={f.id}
                    className="flex-shrink-0 w-12 h-14 rounded-xl bg-[#081124] border border-white/10 hover:border-white/30 transition flex flex-col items-center justify-center p-1 text-center"
                    title={f.name}
                  >
                    <div className="w-7 h-7 flex items-center justify-center mb-0.5">
                      {f.logoUrl ? (
                        <img src={f.logoUrl} alt={f.id} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <span className="text-sm">{f.emoji}</span>
                      )}
                    </div>
                    <span className="text-[9px] font-black" style={{ color: f.primary }}>
                      {f.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gamer Status Card (Logged in or Guest) */}
            <div className="p-3 rounded-2xl bg-gradient-to-r from-[#0C1A36] to-[#071022] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1769FF] to-[#00E5FF] flex items-center justify-center text-white font-black text-sm shadow">
                  {user?.display_name ? user.display_name.charAt(0).toUpperCase() : '🏏'}
                </div>
                <div>
                  <div className="font-['Manrope'] font-bold text-xs text-white flex items-center gap-1.5">
                    {user?.display_name || user?.username || 'Guest Player'}
                    {user ? (
                      <span className="text-[8px] bg-[#D9FF4D]/20 text-[#D9FF4D] px-1.5 py-0.2 rounded font-extrabold">
                        LVL {user.level || 1}
                      </span>
                    ) : (
                      <span className="text-[8px] bg-white/10 text-[#8993A8] px-1.5 py-0.2 rounded">
                        GUEST
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#8993A8]">
                    {user ? `${user.xp || 100} XP · ${user.rank_name || 'Rookie'}` : 'Sign in to save squads & achievements'}
                  </div>
                </div>
              </div>

              {user ? (
                <button
                  onClick={handleSignOut}
                  className="text-xs text-[#8993A8] hover:text-[#FF344C] transition p-1.5"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              ) : (
                <GameButton
                  onClick={() => navigate('/login')}
                  variant="glass"
                  size="sm"
                >
                  SIGN IN
                </GameButton>
              )}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: MATCHES / PUBLIC ARENAS                                         */}
        {/* ========================================================================= */}
        {activeTab === 'matches' && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-3 mb-2 pt-1">
              <button 
                onClick={() => setActiveTab('home')} 
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white transition"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="font-black text-xl font-['Manrope']">Public Arenas</h1>
              <button 
                onClick={fetchRooms}
                className="ml-auto w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white transition"
                title="Refresh rooms"
              >
                <RefreshCw size={16} className={roomsLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMatchesFilter('live')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  matchesFilter === 'live' ? 'bg-[#D9FF4D] text-[#051120]' : 'bg-white/5 text-[#8993A8] hover:text-white'
                }`}
              >
                Live ({publicRooms.length})
              </button>
              <button
                onClick={() => setMatchesFilter('upcoming')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  matchesFilter === 'upcoming' ? 'bg-[#D9FF4D] text-[#051120]' : 'bg-white/5 text-[#8993A8] hover:text-white'
                }`}
              >
                Upcoming (2)
              </button>
              <button
                onClick={() => setMatchesFilter('finished')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  matchesFilter === 'finished' ? 'bg-[#D9FF4D] text-[#051120]' : 'bg-white/5 text-[#8993A8] hover:text-white'
                }`}
              >
                Finished (2)
              </button>
              <button 
                onClick={() => navigate('/create')} 
                className="ml-auto text-xs bg-[#D9FF4D]/10 text-[#D9FF4D] border border-[#D9FF4D]/25 px-2.5 py-1.5 rounded-xl font-bold hover:bg-[#D9FF4D]/20 transition flex items-center gap-1"
              >
                ＋ Host
              </button>
            </div>

            {/* TAB 1: LIVE ROOMS */}
            {matchesFilter === 'live' && (
              <>
                {publicRooms.length === 0 ? (
                  <div className="p-8 text-center bg-[#081124] border border-white/10 rounded-2xl">
                    <div className="text-3xl mb-2">🏏</div>
                    <h3 className="font-black text-sm text-white mb-1">No Active Public Rooms</h3>
                    <p className="text-xs text-[#8993A8] mb-4">Be the first to create an auction arena and invite players or AI bots!</p>
                    <GameButton
                      onClick={() => navigate('/create')}
                      variant="primary"
                      size="md"
                    >
                      CREATE ARENA NOW
                    </GameButton>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publicRooms.map((r: any) => {
                      const hostFranchise = r.host_franchise || 'CSK';
                      const oppFranchise = hostFranchise === 'CSK' ? 'MI' : 'CSK';
                      return (
                        <div key={r.id || r.room_code} className="p-3.5 bg-[#09152B] border border-white/10 rounded-2xl hover:border-white/20 transition">
                          <div className="flex justify-between items-center text-[10px] text-[#A8B3C6] mb-2">
                            <span className="font-mono font-black text-[#D9FF4D]">ROOM #{r.room_code}</span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                              {r.status || 'LOBBY'}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 items-center text-center py-2 border-y border-white/5 my-1.5">
                            <div className="flex flex-col items-center">
                              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center p-1 mb-1">
                                {FRANCHISE_MAP[hostFranchise]?.logoUrl ? (
                                  <img src={FRANCHISE_MAP[hostFranchise].logoUrl} alt={hostFranchise} className="max-h-full object-contain" />
                                ) : (
                                  <span>{FRANCHISE_MAP[hostFranchise]?.emoji || '🦁'}</span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold" style={{ color: FRANCHISE_MAP[hostFranchise]?.primary }}>
                                {FRANCHISE_MAP[hostFranchise]?.name.split(' ')[0]}
                              </span>
                            </div>

                            <span className="text-xs font-black text-[#8993A8] italic">VS</span>

                            <div className="flex flex-col items-center">
                              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center p-1 mb-1">
                                {FRANCHISE_MAP[oppFranchise]?.logoUrl ? (
                                  <img src={FRANCHISE_MAP[oppFranchise].logoUrl} alt={oppFranchise} className="max-h-full object-contain" />
                                ) : (
                                  <span>{FRANCHISE_MAP[oppFranchise]?.emoji || '⚡'}</span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold" style={{ color: FRANCHISE_MAP[oppFranchise]?.primary }}>
                                {FRANCHISE_MAP[oppFranchise]?.name.split(' ')[0]}
                              </span>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-1.5">
                            <div className="text-[10px] text-[#8993A8]">
                              Purse: <b className="text-white">{formatCr(r.starting_purse_lakhs || 12000)}</b> · Max: {r.max_teams || 10} Teams
                            </div>
                            <GameButton
                              onClick={() => navigate(`/room/${r.room_code}`)}
                              variant="primary"
                              size="sm"
                            >
                              JOIN
                            </GameButton>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: UPCOMING */}
            {matchesFilter === 'upcoming' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-[#09152B] border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-center text-[10px] text-[#A8B3C6] mb-2">
                    <span className="font-bold text-[#00E5FF]">MEGA TOURNAMENT · 10 OVERS</span>
                    <span className="text-[#D9FF4D] font-bold">● 6/10 JOINED</span>
                  </div>
                  <div className="grid grid-cols-3 items-center text-center py-2 border-y border-white/5 my-1.5">
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center p-1 mb-1">
                        <img src={FRANCHISE_MAP['CSK']?.logoUrl} alt="CSK" className="max-h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-[#F9CD05]">Chennai Kings</span>
                    </div>
                    <span className="text-xs font-black text-[#8993A8] italic">VS</span>
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center p-1 mb-1">
                        <img src={FRANCHISE_MAP['MI']?.logoUrl} alt="MI" className="max-h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-[#004BA0]">Mumbai Indians</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-[10px] text-[#8993A8]">Starts in 25 mins · Purse ₹120 Cr</span>
                    <GameButton
                      onClick={() => navigate('/create')}
                      variant="glass"
                      size="sm"
                    >
                      PRE-JOIN
                    </GameButton>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FINISHED */}
            {matchesFilter === 'finished' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-[#09152B] border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-center text-[10px] text-[#A8B3C6] mb-2">
                    <span className="font-bold text-white">MEGA FINAL #8A1B9C</span>
                    <span className="text-[#D9FF4D] font-extrabold flex items-center gap-1">
                      <TrophyCupIcon size={12} color="#D9FF4D" /> CSK WON
                    </span>
                  </div>
                  <div className="text-[10px] text-[#8993A8] text-center py-2">
                    Top Buy: Virat Kohli (₹19.50 Cr) · Total Spent: ₹118.25 Cr
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: PLAY LAUNCHPAD                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'play' && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-3 mb-2 pt-1">
              <button 
                onClick={() => setActiveTab('home')} 
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white transition"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="font-black text-xl font-['Manrope']">Play Auction</h1>
            </div>

            <div 
              onClick={() => navigate('/create')}
              className="p-4 bg-gradient-to-r from-[#0C1E3C] to-[#071329] border border-white/10 hover:border-[#D9FF4D] rounded-2xl flex items-center gap-3.5 cursor-pointer transition group shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-[#1769FF]/20 text-[#00E5FF] flex items-center justify-center text-xl font-bold group-hover:scale-105 transition">
                <GavelIcon size={22} color="#00E5FF" />
              </div>
              <div>
                <b className="font-black text-sm font-['Manrope'] text-white block">Host a New Room</b>
                <small className="text-xs text-[#8993A8] block mt-0.5">Custom purse, timer, private passwords & AI bots.</small>
              </div>
              <ChevronRight size={20} className="ml-auto text-[#D9FF4D]" />
            </div>

            <div 
              onClick={() => navigate('/join')}
              className="p-4 bg-gradient-to-r from-[#0C1E3C] to-[#071329] border border-white/10 hover:border-[#00E5FF] rounded-2xl flex items-center gap-3.5 cursor-pointer transition group shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-[#D9FF4D]/20 text-[#D9FF4D] flex items-center justify-center text-xl font-bold group-hover:scale-105 transition">
                <ShieldCrestIcon size={22} color="#D9FF4D" />
              </div>
              <div>
                <b className="font-black text-sm font-['Manrope'] text-white block">Join With Code</b>
                <small className="text-xs text-[#8993A8] block mt-0.5">Enter a 6-character room code to join your friends.</small>
              </div>
              <ChevronRight size={20} className="ml-auto text-[#00E5FF]" />
            </div>

            <div 
              onClick={() => navigate('/create')}
              className="p-4 bg-gradient-to-r from-[#170E28] to-[#0D091B] border border-purple-500/30 hover:border-purple-400 rounded-2xl flex items-center gap-3.5 cursor-pointer transition group shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition">
                <BotsAiIcon size={22} color="#D8B4FE" />
              </div>
              <div>
                <b className="font-black text-sm font-['Manrope'] text-white block">Solo vs AI Bots</b>
                <small className="text-xs text-[#8993A8] block mt-0.5">Practice bidding against automated bots (Easy, Medium, Hard).</small>
              </div>
              <span className="ml-auto text-[10px] font-black bg-purple-500/30 text-purple-300 px-2 py-1 rounded-lg">
                SOLO
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 4: FRIENDS & COMMUNITY                                             */}
        {/* ========================================================================= */}
        {activeTab === 'friends' && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-3 mb-2 pt-1">
              <button 
                onClick={() => setActiveTab('home')} 
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white transition"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="font-black text-xl font-['Manrope']">Friends & Crew</h1>
            </div>

            <GameButton
              onClick={handleCopyShare}
              variant="primary"
              size="md"
              fullWidth
              icon={copiedLink ? <CheckmarkIcon size={16} color="#051120" /> : <ShareInviteIcon size={16} color="#051120" />}
            >
              {copiedLink ? 'INVITE LINK COPIED!' : 'SHARE ARENA INVITE LINK'}
            </GameButton>

            <div>
              <div className="flex justify-between items-center my-3">
                <h2 className="font-black text-xs uppercase tracking-wider text-[#8993A8] font-['Manrope']">
                  Online in Arena · 3
                </h2>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-[#09152B] border border-white/10 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#CA855A] to-[#592D48] flex items-center justify-center font-black text-sm text-white">
                    HP
                  </div>
                  <div>
                    <b className="text-xs font-bold text-white block">Hank Studio</b>
                    <small className="text-[10px] text-[#8993A8]">Hosting CSK Arena · Round 1</small>
                  </div>
                  <span className="ml-auto text-[10px] font-bold text-[#D9FF4D] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D9FF4D]"></span> ONLINE
                  </span>
                </div>

                <div className="p-3 bg-[#09152B] border border-white/10 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#70B9D7] to-[#3F4271] flex items-center justify-center font-black text-sm text-white">
                    AI
                  </div>
                  <div>
                    <b className="text-xs font-bold text-white block">Strategic Bot (MI)</b>
                    <small className="text-[10px] text-[#8993A8]">Autonomous Bidding System</small>
                  </div>
                  <span className="ml-auto text-[10px] font-bold text-[#D9FF4D] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D9FF4D]"></span> ONLINE
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 5: USER PROFILE & STATS                                            */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-3 mb-2 pt-1">
              <button 
                onClick={() => setActiveTab('home')} 
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white transition"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="font-black text-xl font-['Manrope']">My Profile</h1>
            </div>

            {/* Profile Hero Box */}
            <div className="p-5 text-center bg-gradient-to-br from-[#10254D] to-[#061122] border border-white/15 rounded-3xl shadow-xl">
              <div className="w-16 h-16 rounded-2xl border-2 border-[#8BC9FF] bg-gradient-to-br from-[#CF855C] to-[#522B4B] mx-auto flex items-center justify-center text-xl font-bold mb-2 shadow">
                {user?.display_name ? user.display_name.charAt(0).toUpperCase() : '🏏'}
              </div>
              <h2 className="font-['Manrope'] font-black text-xl text-white">
                {user?.display_name || user?.username || 'Guest Player'}
              </h2>
              <p className="text-xs text-[#8993A8] mt-0.5">
                @{user?.username || 'guest'} · Member since 2026
              </p>
              <div className="inline-flex items-center gap-1 bg-[#D9FF4D]/15 text-[#D9FF4D] border border-[#D9FF4D]/30 px-3 py-1 rounded-full text-[10px] font-extrabold mt-3">
                <TrophyCupIcon size={12} color="#D9FF4D" /> GOLD LEAGUE
              </div>

              {/* Stats 3-Col Box */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/10">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <b className="font-['Manrope'] font-black text-lg text-white block">
                    {user?.auctions_played || 12}
                  </b>
                  <span className="text-[9px] text-[#8993A8] font-bold">MATCHES</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <b className="font-['Manrope'] font-black text-lg text-[#D9FF4D] block">
                    {user?.auctions_won || 7}
                  </b>
                  <span className="text-[9px] text-[#8993A8] font-bold">WINS</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <b className="font-['Manrope'] font-black text-lg text-[#00E5FF] block">
                    #482
                  </b>
                  <span className="text-[9px] text-[#8993A8] font-bold">RANK</span>
                </div>
              </div>
            </div>

            {/* Strategy / Skills */}
            <div className="p-4 bg-[#09152B] border border-white/10 rounded-2xl">
              <b className="font-['Manrope'] font-bold text-xs uppercase tracking-wider text-[#8993A8] block mb-3">
                Auction Skills
              </b>

              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#A9B7D1]">Bidding Strategy</span>
                    <strong className="text-[#D9FF4D]">86%</strong>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#1769FF] to-[#D9FF4D] w-[86%] rounded-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[#A9B7D1]">Squad Building</span>
                    <strong className="text-[#D9FF4D]">74%</strong>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#1769FF] to-[#D9FF4D] w-[74%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {user ? (
              <GameButton
                onClick={handleSignOut}
                variant="danger"
                size="md"
                fullWidth
                icon={<LogOut size={16} />}
              >
                SIGN OUT
              </GameButton>
            ) : (
              <GameButton
                onClick={() => navigate('/login')}
                variant="primary"
                size="md"
                fullWidth
                icon={<LogIn size={16} />}
              >
                SIGN IN / REGISTER
              </GameButton>
            )}
          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 2. FLOATING BOTTOM NAVIGATION DOCK                                        */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-xl px-4 py-3 bg-[#020814]/95 backdrop-blur-xl border-t border-white/10 z-40 flex justify-between items-center shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        
        {/* Tab 1: Home */}
        <button
          onClick={() => setActiveTab('home')}
          className={`flex-1 py-1 flex flex-col items-center justify-center relative transition ${
            activeTab === 'home' ? 'text-white' : 'text-[#8993A9] hover:text-white'
          }`}
        >
          <CricketBatBallIcon size={20} color={activeTab === 'home' ? '#D9FF4D' : '#8993A9'} />
          <span className="text-[9px] font-extrabold mt-1">Home</span>
          {activeTab === 'home' && <span className="w-1.5 h-1.5 bg-[#D9FF4D] rounded-full mt-0.5"></span>}
        </button>

        {/* Tab 2: Matches */}
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex-1 py-1 flex flex-col items-center justify-center relative transition ${
            activeTab === 'matches' ? 'text-white' : 'text-[#8993A9] hover:text-white'
          }`}
        >
          <ShieldCrestIcon size={20} color={activeTab === 'matches' ? '#D9FF4D' : '#8993A9'} />
          <span className="text-[9px] font-extrabold mt-1">Arenas</span>
          {activeTab === 'matches' && <span className="w-1.5 h-1.5 bg-[#D9FF4D] rounded-full mt-0.5"></span>}
        </button>

        {/* Tab 3: Central Action Button - PLAY */}
        <button
          onClick={() => setActiveTab('play')}
          className="w-13 h-13 -mt-6 rounded-2xl bg-gradient-to-tr from-[#EAF4FF] via-[#D9FF4D] to-[#B8E619] text-[#051120] flex flex-col items-center justify-center shadow-[0_0_25px_rgba(217,255,77,0.45)] border-2 border-white/60 transform hover:scale-105 active:scale-95 transition"
        >
          <GavelIcon size={22} color="#051120" />
          <span className="text-[8px] font-black uppercase tracking-tight mt-0.5">Play</span>
        </button>

        {/* Tab 4: Friends */}
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-1 flex flex-col items-center justify-center relative transition ${
            activeTab === 'friends' ? 'text-white' : 'text-[#8993A9] hover:text-white'
          }`}
        >
          <Users size={20} color={activeTab === 'friends' ? '#D9FF4D' : '#8993A9'} />
          <span className="text-[9px] font-extrabold mt-1">Crew</span>
          {activeTab === 'friends' && <span className="w-1.5 h-1.5 bg-[#D9FF4D] rounded-full mt-0.5"></span>}
        </button>

        {/* Tab 5: Profile */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-1 flex flex-col items-center justify-center relative transition ${
            activeTab === 'profile' ? 'text-white' : 'text-[#8993A9] hover:text-white'
          }`}
        >
          <User size={20} color={activeTab === 'profile' ? '#D9FF4D' : '#8993A9'} />
          <span className="text-[9px] font-extrabold mt-1">Profile</span>
          {activeTab === 'profile' && <span className="w-1.5 h-1.5 bg-[#D9FF4D] rounded-full mt-0.5"></span>}
        </button>

      </nav>

    </div>
  );
}
