import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, Flame, LogIn, Plus, Users, Copy, Check, 
  Search, Play, Shield, ChevronRight, Crown, 
  MessageSquare, Award, ArrowLeft, Radio, Bell, 
  Sparkles, ExternalLink, RefreshCw, User, LogOut
} from 'lucide-react';
import { ALL_FRANCHISES, FRANCHISE_MAP, formatCr } from '../lib/utils';
import { safeFetch } from '../lib/api';

type TabType = 'home' | 'matches' | 'play' | 'friends' | 'profile';

export default function Home() {
  const navigate = useNavigate();
  
  // Navigation & Screen state
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [splashVisible, setSplashVisible] = useState(() => {
    // Only show splash once per browser session
    return !sessionStorage.getItem('ca26_splash_seen');
  });
  const [splashReady, setSplashReady] = useState(false);
  const [connectionText, setConnectionText] = useState('Connecting to server...');

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
        setConnectionText('Connection secured. Ready to play.');
        setSplashReady(true);
      })
      .catch(() => {
        setConnectionText('Connected in offline/local mode.');
        setSplashReady(true);
      });

    // Auto-advance splash after 2.5 seconds if server is ready
    const timer = setTimeout(() => {
      setSplashReady(true);
    }, 2500);

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

  // Featured live card details (simulated showcase or real first room)
  const featuredRoom = publicRooms[0];
  const currentSpotlight = SPOTLIGHT_PLAYERS[spotlightIndex];
  const featuredHost = featuredRoom?.host_franchise || currentSpotlight.team1;
  const featuredOpponent = featuredRoom ? (featuredHost === 'CSK' ? 'MI' : 'CSK') : currentSpotlight.team2;
  const featuredBid = featuredRoom ? '18.5' : currentSpotlight.bid;

  return (
    <div className="min-h-screen bg-[#020B18] text-[#F5F7FF] font-['DM_Sans',sans-serif] relative overflow-x-hidden select-none">
      
      {/* 1. Animated Cricket Splash Screen */}
      {splashVisible && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-radial from-[#0D3E7A] to-[#020916] transition-opacity duration-500 ${!splashVisible ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="text-center w-full max-w-xs animate-fade-up">
            
            {/* Spinning Cricket Ball */}
            <div className="cricket-ball mb-6 cursor-pointer" onClick={handleStartFromSplash} title="Click to start"></div>
            
            <h1 className="text-3xl font-extrabold tracking-tight font-['Manrope'] mb-2">
              CRICK<span className="text-[#D9FF4D]">·</span>AUCTION
            </h1>
            <p className="text-xs text-[#AEB9CF] mb-5 tracking-wide">
              IPL 2026 MULTIPLAYER ARENA
            </p>

            <div className="mb-4">
              <p className="text-xs text-[#D9FF4D] font-medium mb-3">
                {connectionText}
              </p>
              
              {!splashReady ? (
                <div className="h-1 bg-white/10 rounded-full overflow-hidden w-48 mx-auto">
                  <div className="h-full bg-gradient-to-r from-[#1DC7FF] to-[#D9FF4D] w-full animate-pulse"></div>
                </div>
              ) : (
                <button
                  onClick={handleStartFromSplash}
                  className="w-full py-3.5 px-6 bg-[#D9FF4D] hover:bg-[#c7f035] text-[#07111E] font-extrabold text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_25px_rgba(217,255,77,0.35)] transform active:scale-95 animate-fade-up"
                >
                  CLICK TO START
                </button>
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
      <div className="max-w-md md:max-w-xl mx-auto min-h-screen relative flex flex-col justify-between pb-28 px-4 pt-3">
        
        {/* Top Header */}
        <header className="flex justify-between items-center py-3 mb-2">
          {/* Brand Logo & Mark */}
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <i className="brand-mark"></i>
            <div>
              <span className="font-extrabold text-xl tracking-tight font-['Manrope'] leading-none block">
                Crick<span className="text-[#D9FF4D]">Auction</span>
              </span>
              <span className="text-[9px] font-bold tracking-widest text-[#8993A8] uppercase block mt-0.5">
                IPL 2026 EDITION
              </span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('matches')}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center text-[#8993A8] hover:text-white relative"
              title="Search Matches"
            >
              <Search size={18} />
              {publicRooms.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF344C] animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('friends')}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center text-[#8993A8] hover:text-white relative"
              title="Friends & Crew"
            >
              <Users size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#FF344C]"></span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-center text-[#8993A8] hover:text-white"
              title="Profile"
            >
              <User size={18} />
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* SCREEN 1: HOME DASHBOARD                                                  */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-5 animate-fade-up">
            
            {/* Sub-tab Pill Navigation */}
            <div className="flex justify-around border-b border-white/10 pb-2 text-xs font-medium text-[#8993A8]">
              <button 
                onClick={() => setActiveTab('home')}
                className="pb-2 border-b-2 border-white text-white font-bold"
              >
                Live Spotlight
              </button>
              <button 
                onClick={() => setActiveTab('matches')}
                className="pb-2 hover:text-white transition"
              >
                Upcoming Arenas ({publicRooms.length})
              </button>
              <button 
                onClick={() => setActiveTab('play')}
                className="pb-2 hover:text-white transition text-[#D9FF4D]"
              >
                Create Room
              </button>
            </div>

            {/* Hero Live Spotlight Card */}
            <div className="relative rounded-2xl p-4 bg-gradient-to-br from-[#0E193A] to-[#101E44] border border-white/15 overflow-hidden shadow-xl">
              <div className="live-grid-pattern"></div>
              
              {/* Header inside Card */}
              <div className="relative z-10 flex justify-between items-center text-[10px] text-[#BDC7DA] mb-3">
                <span className="bg-[#F51B38] text-white px-2.5 py-1 rounded-full font-black tracking-wide flex items-center gap-1.5 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span> LIVE ARENA
                </span>
                <span className="font-bold uppercase tracking-wider">
                  {featuredRoom ? `ROOM #${featuredRoom.room_code}` : `IPL 2026 · ${currentSpotlight.round}`}
                </span>
              </div>

              {/* Match Teams & Center Score */}
              <div className="relative z-10 grid grid-cols-3 items-center text-center py-2">
                {/* Team 1 */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2 mb-1.5 shadow-md">
                    {FRANCHISE_MAP[featuredHost]?.logoUrl ? (
                      <img src={FRANCHISE_MAP[featuredHost].logoUrl} alt={featuredHost} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-2xl">{FRANCHISE_MAP[featuredHost]?.emoji || '🦁'}</span>
                    )}
                  </div>
                  <b className="text-xs font-bold leading-tight" style={{ color: FRANCHISE_MAP[featuredHost]?.primary }}>
                    {FRANCHISE_MAP[featuredHost]?.name.split(' ')[0]}<br />
                    <span className="text-[#AEB9CF] text-[10px] font-normal">{FRANCHISE_MAP[featuredHost]?.name.split(' ').slice(1).join(' ')}</span>
                  </b>
                </div>

                {/* Score / Bid */}
                <div className="flex flex-col items-center">
                  <div className="text-2xl sm:text-3xl font-black font-['Manrope'] tracking-tight text-[#F5F7FF] leading-none">
                    ₹{featuredBid}<span className="text-xs text-[#D9FF4D]">Cr</span>
                  </div>
                  <small className="text-[9px] text-[#A9B7D1] uppercase tracking-wider font-bold mt-1">
                    CURRENT BID
                  </small>
                  <div className="mt-2 px-2 py-0.5 rounded-full bg-white/10 text-[9px] text-[#D9FF4D] font-mono font-bold">
                    ⏱ 00:{spotlightSeconds.toString().padStart(2, '0')}s
                  </div>
                </div>

                {/* Team 2 */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2 mb-1.5 shadow-md">
                    {FRANCHISE_MAP[featuredOpponent]?.logoUrl ? (
                      <img src={FRANCHISE_MAP[featuredOpponent].logoUrl} alt={featuredOpponent} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-2xl">{FRANCHISE_MAP[featuredOpponent]?.emoji || '🌊'}</span>
                    )}
                  </div>
                  <b className="text-xs font-bold leading-tight" style={{ color: FRANCHISE_MAP[featuredOpponent]?.primary }}>
                    {FRANCHISE_MAP[featuredOpponent]?.name.split(' ')[0]}<br />
                    <span className="text-[#AEB9CF] text-[10px] font-normal">{FRANCHISE_MAP[featuredOpponent]?.name.split(' ').slice(1).join(' ')}</span>
                  </b>
                </div>
              </div>

              {/* Status footer */}
              <div className="relative z-10 text-center text-xs text-[#A9B7D1] mt-3 pt-3 border-t border-white/10 flex flex-col items-center">
                <span>
                  Bidding for <b className="text-[#D9FF4D]">{currentSpotlight.name}</b> · {currentSpotlight.role} · {currentSpotlight.points} Pts
                </span>
                
                {/* Dots indicator matching index.html */}
                <div className="dots mt-2 flex justify-center gap-1.5">
                  {SPOTLIGHT_PLAYERS.map((_, i) => (
                    <i 
                      key={i} 
                      className={`h-1 rounded-full transition-all duration-300 ${i === spotlightIndex ? 'w-5 bg-white' : 'w-2 bg-white/25'}`}
                    />
                  ))}
                </div>

                {/* Action button inside card */}
                <div className="mt-3 flex gap-2 w-full">
                  <button
                    onClick={() => featuredRoom ? navigate(`/room/${featuredRoom.room_code}`) : navigate('/create')}
                    className="flex-1 py-2.5 bg-[#D9FF4D] hover:bg-[#c7f035] text-[#07111E] font-black text-xs rounded-xl transition shadow-md flex items-center justify-center gap-1.5 uppercase"
                  >
                    <Play size={14} fill="#07111E" /> {featuredRoom ? 'ENTER AUCTION' : 'CREATE ARENA'}
                  </button>
                  <button
                    onClick={() => navigate('/join')}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition"
                  >
                    JOIN CODE
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/create')}
                className="p-3.5 rounded-2xl bg-[#0B1730] border border-white/10 hover:border-[#D9FF4D]/40 transition text-left flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#1769FF]/20 text-[#59B8FF] flex items-center justify-center text-lg font-bold group-hover:scale-110 transition">
                  ＋
                </div>
                <div>
                  <b className="text-xs font-bold font-['Manrope'] block text-white">Create Room</b>
                  <span className="text-[10px] text-[#8993A8]">Host custom auction</span>
                </div>
              </button>

              <button
                onClick={() => navigate('/join')}
                className="p-3.5 rounded-2xl bg-[#0B1730] border border-white/10 hover:border-[#D9FF4D]/40 transition text-left flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-[#D9FF4D]/20 text-[#D9FF4D] flex items-center justify-center text-lg font-bold group-hover:scale-110 transition">
                  ⌁
                </div>
                <div>
                  <b className="text-xs font-bold font-['Manrope'] block text-white">Join by Code</b>
                  <span className="text-[10px] text-[#8993A8]">Enter with room pin</span>
                </div>
              </button>
            </div>

            {/* Highlight Stories Section (from index.html) */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h2 className="font-bold text-xs uppercase tracking-wider text-[#8993A8] font-['Manrope']">
                  Featured Highlights
                </h2>
                <button onClick={() => setActiveTab('matches')} className="text-xs text-[#59B8FF] font-medium flex items-center">
                  See rooms <ChevronRight size={14} />
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                <div 
                  onClick={() => navigate('/create')}
                  className="min-w-[190px] h-28 rounded-2xl p-3 relative overflow-hidden bg-gradient-to-br from-[#303A87] to-[#07183C] border border-white/15 cursor-pointer hover:border-white/30 transition flex flex-col justify-between"
                >
                  <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full w-max">
                    IPL 2026
                  </span>
                  <div className="ball-watermark"></div>
                  <b className="font-extrabold text-sm font-['Manrope'] leading-tight">
                    250 REAL PLAYERS<br />EXCEL POOL
                  </b>
                </div>

                <div 
                  onClick={() => navigate('/join')}
                  className="min-w-[190px] h-28 rounded-2xl p-3 relative overflow-hidden bg-gradient-to-br from-[#61413C] to-[#192A5C] border border-white/15 cursor-pointer hover:border-white/30 transition flex flex-col justify-between"
                >
                  <span className="text-[9px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full w-max">
                    MULTIPLAYER
                  </span>
                  <div className="ball-watermark"></div>
                  <b className="font-extrabold text-sm font-['Manrope'] leading-tight">
                    CSK vs MI<br />MEGA BIDDING
                  </b>
                </div>
              </div>
            </div>

            {/* All 10 Franchises Strip */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <h2 className="font-bold text-xs uppercase tracking-wider text-[#8993A8] font-['Manrope']">
                  IPL 2026 Franchises (10)
                </h2>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {ALL_FRANCHISES.map(f => (
                  <div 
                    key={f.id} 
                    className="min-w-[58px] p-2 rounded-xl bg-[#0B1730] border border-white/10 flex flex-col items-center text-center"
                  >
                    <div className="w-8 h-8 flex items-center justify-center mb-1">
                      {f.logoUrl ? (
                        <img src={f.logoUrl} alt={f.id} className="max-h-full max-w-full object-contain drop-shadow" />
                      ) : (
                        <span>{f.emoji}</span>
                      )}
                    </div>
                    <span className="text-[10px] font-black" style={{ color: f.primary }}>
                      {f.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: MATCHES / PUBLIC ARENAS                                         */}
        {/* ========================================================================= */}
        {activeTab === 'matches' && (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center gap-3 mb-2">
              <button 
                onClick={() => setActiveTab('home')} 
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="font-extrabold text-xl font-['Manrope']">Public Arenas</h1>
              <button 
                onClick={fetchRooms}
                className="ml-auto w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white"
              >
                <RefreshCw size={16} className={roomsLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Multi-tab selector from index.html */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setMatchesFilter('live')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  matchesFilter === 'live' ? 'bg-white/20 text-white' : 'bg-white/5 text-[#8993A8] hover:text-white'
                }`}
              >
                Live ({publicRooms.length})
              </button>
              <button
                onClick={() => setMatchesFilter('upcoming')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  matchesFilter === 'upcoming' ? 'bg-white/20 text-white' : 'bg-white/5 text-[#8993A8] hover:text-white'
                }`}
              >
                Upcoming (2)
              </button>
              <button
                onClick={() => setMatchesFilter('finished')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  matchesFilter === 'finished' ? 'bg-white/20 text-white' : 'bg-white/5 text-[#8993A8] hover:text-white'
                }`}
              >
                Finished (2)
              </button>
              <button 
                onClick={() => navigate('/create')} 
                className="ml-auto text-xs bg-[#D9FF4D]/10 text-[#D9FF4D] border border-[#D9FF4D]/25 px-2.5 py-1.5 rounded-lg font-bold hover:bg-[#D9FF4D]/20 transition flex items-center gap-1"
              >
                ＋ Host
              </button>
            </div>

            {/* TAB 1: LIVE ROOMS */}
            {matchesFilter === 'live' && (
              <>
                {publicRooms.length === 0 ? (
                  <div className="p-8 text-center bg-[#0B1730] border border-white/10 rounded-2xl">
                    <div className="text-3xl mb-2">🏏</div>
                    <h3 className="font-bold text-sm text-white mb-1">No Active Public Rooms</h3>
                    <p className="text-xs text-[#8993A8] mb-4">Be the first to create an auction arena and invite players or AI bots!</p>
                    <button
                      onClick={() => navigate('/create')}
                      className="px-5 py-2.5 bg-[#D9FF4D] text-[#07111E] font-black text-xs rounded-xl hover:bg-[#c7f035] transition"
                    >
                      CREATE ARENA NOW
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {publicRooms.map((r: any) => {
                      const hostFranchise = r.host_franchise || 'CSK';
                      const oppFranchise = hostFranchise === 'CSK' ? 'MI' : 'CSK';
                      return (
                        <div key={r.id || r.room_code} className="p-3.5 bg-[#0B1730] border border-white/10 rounded-2xl hover:border-white/20 transition">
                          <div className="flex justify-between items-center text-[10px] text-[#A8B3C6] mb-2">
                            <span className="font-bold text-[#D9FF4D]">ROOM #{r.room_code}</span>
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
                            <button
                              onClick={() => navigate(`/room/${r.room_code}`)}
                              className="px-4 py-1.5 bg-[#D9FF4D] hover:bg-[#c7f035] text-[#07111E] font-black text-xs rounded-xl transition shadow"
                            >
                              JOIN
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* TAB 2: UPCOMING TOURNAMENTS */}
            {matchesFilter === 'upcoming' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-[#0B1730] border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-center text-[10px] text-[#A8B3C6] mb-2">
                    <span className="font-bold text-[#59B8FF]">MEGA TOURNAMENT · 10 OVERS</span>
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
                      <span className="text-[10px] font-bold text-[#004BA0]">Mumbai Blasters</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-[10px] text-[#8993A8]">Starts in 15 mins · Purse ₹120 Cr</span>
                    <button
                      onClick={() => navigate('/create')}
                      className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-[#D9FF4D] font-bold text-xs rounded-xl transition"
                    >
                      PRE-JOIN
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-[#0B1730] border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-center text-[10px] text-[#A8B3C6] mb-2">
                    <span className="font-bold text-[#59B8FF]">CHALLENGER CUP · 8 OVERS</span>
                    <span className="text-[#D9FF4D] font-bold">● 4/8 JOINED</span>
                  </div>
                  <div className="grid grid-cols-3 items-center text-center py-2 border-y border-white/5 my-1.5">
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center p-1 mb-1">
                        <img src={FRANCHISE_MAP['RCB']?.logoUrl} alt="RCB" className="max-h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-[#EC1C24]">Royal Challengers</span>
                    </div>
                    <span className="text-xs font-black text-[#8993A8] italic">VS</span>
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center p-1 mb-1">
                        <img src={FRANCHISE_MAP['KKR']?.logoUrl} alt="KKR" className="max-h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-[#ECC542]">Knight Riders</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1.5">
                    <span className="text-[10px] text-[#8993A8]">Starts in 45 mins · Purse ₹100 Cr</span>
                    <button
                      onClick={() => navigate('/create')}
                      className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-[#D9FF4D] font-bold text-xs rounded-xl transition"
                    >
                      PRE-JOIN
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: FINISHED RESULTS */}
            {matchesFilter === 'finished' && (
              <div className="space-y-3">
                <div className="p-3.5 bg-[#0B1730] border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-center text-[10px] text-[#A8B3C6] mb-2">
                    <span className="font-bold text-white">MEGA FINAL #8A1B9C</span>
                    <span className="text-[#D9FF4D] font-extrabold">🏆 WON BY CSK</span>
                  </div>
                  <div className="grid grid-cols-3 items-center text-center py-2 border-y border-white/5 my-1.5">
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-xl bg-[#F9CD05]/10 border border-[#F9CD05]/30 flex items-center justify-center p-1 mb-1">
                        <img src={FRANCHISE_MAP['CSK']?.logoUrl} alt="CSK" className="max-h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-black text-[#F9CD05]">CSK (142 Pts)</span>
                    </div>
                    <span className="text-xs font-black text-[#8993A8] italic">VS</span>
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center p-1 mb-1">
                        <img src={FRANCHISE_MAP['MI']?.logoUrl} alt="MI" className="max-h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-[#A3A7B0]">MI (136 Pts)</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#8993A8] mt-1 text-center">
                    Top Buy: Virat Kohli (₹19.50 Cr) · Total Spent: ₹118.25 Cr
                  </div>
                </div>

                <div className="p-3.5 bg-[#0B1730] border border-white/10 rounded-2xl">
                  <div className="flex justify-between items-center text-[10px] text-[#A8B3C6] mb-2">
                    <span className="font-bold text-white">ALL-STAR DERBY #3K7P2A</span>
                    <span className="text-[#D9FF4D] font-extrabold">🏆 WON BY RCB</span>
                  </div>
                  <div className="grid grid-cols-3 items-center text-center py-2 border-y border-white/5 my-1.5">
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-xl bg-[#EC1C24]/10 border border-[#EC1C24]/30 flex items-center justify-center p-1 mb-1">
                        <img src={FRANCHISE_MAP['RCB']?.logoUrl} alt="RCB" className="max-h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-black text-[#EC1C24]">RCB (138 Pts)</span>
                    </div>
                    <span className="text-xs font-black text-[#8993A8] italic">VS</span>
                    <div className="flex flex-col items-center">
                      <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center p-1 mb-1">
                        <img src={FRANCHISE_MAP['GT']?.logoUrl} alt="GT" className="max-h-full object-contain" />
                      </div>
                      <span className="text-[10px] font-bold text-[#A3A7B0]">GT (129 Pts)</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-[#8993A8] mt-1 text-center">
                    Top Buy: Rohit Sharma (₹21.00 Cr) · Total Spent: ₹119.50 Cr
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
            <div className="flex items-center gap-3 mb-2">
              <button 
                onClick={() => setActiveTab('home')} 
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="font-extrabold text-xl font-['Manrope']">Play Auction</h1>
            </div>

            <div 
              onClick={() => navigate('/create')}
              className="p-4 bg-[#0B1730] border border-white/10 hover:border-[#D9FF4D] rounded-2xl flex items-center gap-3.5 cursor-pointer transition group shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-[#1769FF]/20 text-[#59B8FF] flex items-center justify-center text-2xl font-bold group-hover:scale-110 transition">
                ＋
              </div>
              <div>
                <b className="font-extrabold text-sm font-['Manrope'] text-white block">Create a Room</b>
                <small className="text-xs text-[#8993A8] block mt-0.5">Host your own private or public auction with custom purse & timer.</small>
              </div>
              <ChevronRight size={20} className="ml-auto text-[#D9FF4D]" />
            </div>

            <div 
              onClick={() => navigate('/join')}
              className="p-4 bg-[#0B1730] border border-white/10 hover:border-[#D9FF4D] rounded-2xl flex items-center gap-3.5 cursor-pointer transition group shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-[#D9FF4D]/20 text-[#D9FF4D] flex items-center justify-center text-2xl font-bold group-hover:scale-110 transition">
                ⌁
              </div>
              <div>
                <b className="font-extrabold text-sm font-['Manrope'] text-white block">Join a Room</b>
                <small className="text-xs text-[#8993A8] block mt-0.5">Enter a 6-character room code to join your friends.</small>
              </div>
              <ChevronRight size={20} className="ml-auto text-[#D9FF4D]" />
            </div>

            {/* Quick Practice Match vs AI */}
            <div 
              onClick={() => navigate('/create')}
              className="p-4 bg-gradient-to-r from-[#0B1730] to-[#122247] border border-white/10 rounded-2xl flex items-center gap-3.5 cursor-pointer transition hover:border-white/30"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl">
                🤖
              </div>
              <div>
                <b className="font-extrabold text-sm font-['Manrope'] text-white block">Solo vs AI Bots</b>
                <small className="text-xs text-[#8993A8] block mt-0.5">Practice bidding against automated bots (Easy, Medium, Hard).</small>
              </div>
              <span className="ml-auto text-[10px] font-bold bg-[#D9FF4D] text-[#07111E] px-2 py-1 rounded-lg">
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
            <div className="flex items-center gap-3 mb-2">
              <button 
                onClick={() => setActiveTab('home')} 
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="font-extrabold text-xl font-['Manrope']">Friends & Crew</h1>
            </div>

            <button 
              onClick={handleCopyShare}
              className="w-full py-3.5 bg-[#D9FF4D] hover:bg-[#c7f035] text-[#07111E] font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
            >
              {copiedLink ? <Check size={16} /> : <Share2Icon size={16} />}
              {copiedLink ? 'INVITE LINK COPIED!' : 'SHARE AUCTION INVITE LINK'}
            </button>

            <div>
              <div className="flex justify-between items-center my-3">
                <h2 className="font-bold text-xs uppercase tracking-wider text-[#8993A8] font-['Manrope']">
                  Online in Arena · 3
                </h2>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 bg-[#0B1730] border border-white/10 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#CA855A] to-[#592D48] flex items-center justify-center font-bold text-sm">
                    HP
                  </div>
                  <div>
                    <b className="text-xs font-bold text-white block">Hank Studio</b>
                    <small className="text-[10px] text-[#8993A8]">Hosting CSK Auction · Round 1</small>
                  </div>
                  <span className="ml-auto text-[10px] font-bold text-[#D9FF4D] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D9FF4D]"></span> ONLINE
                  </span>
                </div>

                <div className="p-3 bg-[#0B1730] border border-white/10 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#70B9D7] to-[#3F4271] flex items-center justify-center font-bold text-sm">
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

                <div className="p-3 bg-[#0B1730] border border-white/10 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#B776CF] to-[#603D69] flex items-center justify-center font-bold text-sm">
                    CR
                  </div>
                  <div>
                    <b className="text-xs font-bold text-white block">Cricket Challenger</b>
                    <small className="text-[10px] text-[#8993A8]">Browsing public lobbies</small>
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
            <div className="flex items-center gap-3 mb-2">
              <button 
                onClick={() => setActiveTab('home')} 
                className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8993A8] hover:text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="font-extrabold text-xl font-['Manrope']">My Profile</h1>
            </div>

            {/* Profile Hero Box (from index.html) */}
            <div className="p-5 text-center bg-gradient-to-br from-[#10254D] to-[#09152D] border border-white/15 rounded-3xl shadow-xl">
              <div className="w-16 h-16 rounded-full border-2 border-[#8BC9FF] bg-gradient-to-br from-[#CF855C] to-[#522B4B] mx-auto flex items-center justify-center text-xl font-bold mb-2 shadow">
                {user?.display_name ? user.display_name.charAt(0).toUpperCase() : '🏏'}
              </div>

              <h2 className="font-extrabold text-lg font-['Manrope'] text-white">
                {user ? user.display_name || user.username : 'Cricket Tactician'}
              </h2>
              <p className="text-xs text-[#ACB8CC] mt-0.5">
                {user ? `@${user.username}` : '@player'} · Member since 2026
              </p>

              <div className="inline-block bg-white/10 text-[#D9FF4D] text-[10px] font-extrabold rounded-lg px-3 py-1 mt-3">
                ♛ GOLD LEAGUE · MASTER TIER
              </div>
            </div>

            {/* 3 Stats Boxes */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 text-center bg-[#0B1730] border border-white/10 rounded-2xl">
                <b className="font-extrabold text-lg font-['Manrope'] text-white block">
                  {user?.auctions_played || 12}
                </b>
                <span className="text-[9px] text-[#97A1B4] uppercase font-bold tracking-wider">AUCTIONS</span>
              </div>
              <div className="p-3 text-center bg-[#0B1730] border border-white/10 rounded-2xl">
                <b className="font-extrabold text-lg font-['Manrope'] text-[#D9FF4D] block">
                  {user?.auctions_won || 7}
                </b>
                <span className="text-[9px] text-[#97A1B4] uppercase font-bold tracking-wider">TROPHIES</span>
              </div>
              <div className="p-3 text-center bg-[#0B1730] border border-white/10 rounded-2xl">
                <b className="font-extrabold text-lg font-['Manrope'] text-[#59B8FF] block">
                  #14
                </b>
                <span className="text-[9px] text-[#97A1B4] uppercase font-bold tracking-wider">RANK</span>
              </div>
            </div>

            {/* Skill / Strategy Meters (from index.html) */}
            <div className="p-4 bg-[#0B1730] border border-white/10 rounded-2xl">
              <b className="font-bold text-xs uppercase tracking-wider text-[#8993A8] font-['Manrope'] block mb-2">
                Auction Skills Rating
              </b>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-[#AEB7C9] mb-1 font-medium">
                    <span>Bidding Strategy</span>
                    <strong className="text-[#D9FF4D]">88%</strong>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#1769FF] to-[#1DC7FF] w-[88%] rounded-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-[#AEB7C9] mb-1 font-medium">
                    <span>Squad Role Balance</span>
                    <strong className="text-[#D9FF4D]">94%</strong>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#10B981] to-[#D9FF4D] w-[94%] rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Auth Buttons */}
            <div className="pt-2">
              {user ? (
                <button
                  onClick={handleSignOut}
                  className="w-full py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-xs rounded-xl hover:bg-red-500/20 transition flex items-center justify-center gap-2"
                >
                  <LogOut size={16} /> SIGN OUT
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate('/login')}
                    className="flex-1 py-3 bg-[#111318] border border-white/15 text-white font-bold text-xs rounded-xl hover:bg-[#181B21] transition"
                  >
                    SIGN IN
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="flex-1 py-3 bg-[#D9FF4D] text-[#07111E] font-black text-xs rounded-xl hover:bg-[#c7f035] transition"
                  >
                    REGISTER
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 2. FLOATING BOTTOM NAVIGATION DOCK (from index.html)                      */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md md:max-w-xl px-5 py-3.5 bg-gradient-to-t from-[#020814] via-[#020814]/95 to-transparent z-40 flex justify-between items-center">
        
        {/* Tab 1: Home */}
        <button
          onClick={() => setActiveTab('home')}
          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center relative transition ${
            activeTab === 'home' ? 'bg-white/15 text-white' : 'text-[#8993A9] hover:text-white'
          }`}
        >
          <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
            <path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>
          </svg>
          <span className="text-[8px] font-bold mt-0.5">Home</span>
          {activeTab === 'home' && <span className="absolute -bottom-1.5 w-3 h-0.5 bg-[#1769FF] rounded-full"></span>}
        </button>

        {/* Tab 2: Matches */}
        <button
          onClick={() => setActiveTab('matches')}
          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center relative transition ${
            activeTab === 'matches' ? 'bg-white/15 text-white' : 'text-[#8993A9] hover:text-white'
          }`}
        >
          <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="17" rx="2"/>
            <path d="M3 10h18M7 2v4m10-4v4"/>
          </svg>
          <span className="text-[8px] font-bold mt-0.5">Matches</span>
          {activeTab === 'matches' && <span className="absolute -bottom-1.5 w-3 h-0.5 bg-[#1769FF] rounded-full"></span>}
        </button>

        {/* Tab 3: Central Action Button - PLAY */}
        <button
          onClick={() => setActiveTab('play')}
          className="w-13 h-13 -mt-4 rounded-2xl bg-gradient-to-tr from-[#EAF4FF] to-[#D9FF4D] text-[#07152E] flex flex-col items-center justify-center shadow-[0_4px_20px_rgba(217,255,77,0.4)] transform hover:scale-105 active:scale-95 transition"
        >
          <svg className="w-6 h-6 fill-none stroke-current stroke-[2.2]" viewBox="0 0 24 24">
            <path d="m8 5 11 7-11 7z"/>
          </svg>
          <span className="text-[8px] font-black uppercase tracking-tight">Play</span>
        </button>

        {/* Tab 4: Friends */}
        <button
          onClick={() => setActiveTab('friends')}
          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center relative transition ${
            activeTab === 'friends' ? 'bg-white/15 text-white' : 'text-[#8993A9] hover:text-white'
          }`}
        >
          <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3"/>
            <path d="M3 20v-1a5 5 0 0 1 10 0v1m3-11a3 3 0 1 0 0-6m4 17v-1a5 5 0 0 0-3-4.6"/>
          </svg>
          <span className="text-[8px] font-bold mt-0.5">Friends</span>
          {activeTab === 'friends' && <span className="absolute -bottom-1.5 w-3 h-0.5 bg-[#1769FF] rounded-full"></span>}
        </button>

        {/* Tab 5: Profile */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center relative transition ${
            activeTab === 'profile' ? 'bg-white/15 text-white' : 'text-[#8993A9] hover:text-white'
          }`}
        >
          <svg className="w-5 h-5 fill-none stroke-current stroke-[1.8]" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 21a8 8 0 0 1 16 0"/>
          </svg>
          <span className="text-[8px] font-bold mt-0.5">Profile</span>
          {activeTab === 'profile' && <span className="absolute -bottom-1.5 w-3 h-0.5 bg-[#1769FF] rounded-full"></span>}
        </button>

      </nav>

    </div>
  );
}

function Share2Icon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  );
}
