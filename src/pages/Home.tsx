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
  CheckmarkIcon
} from '../components/GameIcons';
import { 
  Search, Users, User, ArrowLeft, RefreshCw, 
  ChevronRight, LogIn, LogOut, Star, Trophy,
  TrendingUp, TrendingDown, Bookmark
} from 'lucide-react';

type TabType = 'rating' | 'matches' | 'teams' | 'play' | 'profile';

// Pre-configured rich roster data for all franchises matching Screenshot 1
const ROSTER_DATA: Record<string, {
  name: string;
  logo: string;
  players: Array<{
    name: string;
    sub: string;
    role: string;
    flag: string;
    isCap?: boolean;
    img: string;
    points: number;
    base: string;
    age: number;
    category: string;
    strikeRate: string;
    economy: string;
  }>;
}> = {
  'CSK': {
    name: 'Chennai Super Kings',
    logo: '/teams/CSK.png',
    players: [
      { name: 'MS Dhoni', sub: 'Mahendra Singh Dhoni · ₹2.00 Cr', role: 'Captain · WK', flag: '🇮🇳', isCap: true, img: '/images/player_hero.jpg', points: 15, base: '₹2.00 Cr', age: 44, category: 'Wicket-Keeper Batter', strikeRate: '136.0', economy: '—' },
      { name: 'Ruturaj Gaikwad', sub: 'Right-Handed Batter · ₹18.00 Cr', role: 'Batter', flag: '🇮🇳', img: '/images/player_hero.jpg', points: 14, base: '₹2.00 Cr', age: 28, category: 'Opening Batter', strikeRate: '137.9', economy: '—' },
      { name: 'Ravindra Jadeja', sub: 'Left-Arm Spin All-Rounder · ₹18.00 Cr', role: 'All-Rounder', flag: '🇮🇳', img: '/images/player_bowler.jpg', points: 14, base: '₹2.00 Cr', age: 36, category: 'All-Rounder', strikeRate: '129.5', economy: '7.60' },
      { name: 'Matheesha Pathirana', sub: 'Right-Arm Fast Sling · ₹13.00 Cr', role: 'Bowler', flag: '🇱🇰', img: '/images/player_bowler.jpg', points: 13, base: '₹1.50 Cr', age: 22, category: 'Fast Bowler', strikeRate: '—', economy: '7.85' },
      { name: 'Shivam Dube', sub: 'Power Hitter All-Rounder · ₹12.00 Cr', role: 'All-Rounder', flag: '🇮🇳', img: '/images/player_hero.jpg', points: 13, base: '₹1.50 Cr', age: 31, category: 'Middle-Order Striker', strikeRate: '159.2', economy: '8.40' }
    ]
  },
  'MI': {
    name: 'Mumbai Indians',
    logo: '/teams/MI.png',
    players: [
      { name: 'Rohit Sharma', sub: 'Hitman Sharma · ₹16.30 Cr', role: 'Captain · Batter', flag: '🇮🇳', isCap: true, img: '/images/player_hero.jpg', points: 15, base: '₹2.00 Cr', age: 37, category: 'Top-Order Batter', strikeRate: '131.1', economy: '—' },
      { name: 'Jasprit Bumrah', sub: 'World #1 Pacer · ₹18.00 Cr', role: 'Bowler', flag: '🇮🇳', img: '/images/player_bowler.jpg', points: 15, base: '₹2.00 Cr', age: 31, category: 'Fast Bowler', strikeRate: '—', economy: '6.48' },
      { name: 'Suryakumar Yadav', sub: 'Mr. 360 T20 Batter · ₹16.35 Cr', role: 'Batter', flag: '🇮🇳', img: '/images/player_hero.jpg', points: 15, base: '₹2.00 Cr', age: 34, category: 'Middle-Order Batter', strikeRate: '168.0', economy: '—' },
      { name: 'Hardik Pandya', sub: 'Fast Bowling All-Rounder · ₹16.35 Cr', role: 'All-Rounder', flag: '🇮🇳', img: '/images/player_bowler.jpg', points: 14, base: '₹2.00 Cr', age: 31, category: 'All-Rounder', strikeRate: '145.8', economy: '8.90' },
      { name: 'Tilak Varma', sub: 'Left-Handed Middle Order · ₹8.00 Cr', role: 'Batter', flag: '🇮🇳', img: '/images/player_hero.jpg', points: 12, base: '₹1.00 Cr', age: 23, category: 'Middle-Order Batter', strikeRate: '144.2', economy: '—' }
    ]
  },
  'RCB': {
    name: 'Royal Challengers Bengaluru',
    logo: '/teams/RCB.png',
    players: [
      { name: 'Virat Kohli', sub: 'King Kohli · ₹21.00 Cr', role: 'Captain · Batter', flag: '🇮🇳', isCap: true, img: '/images/player_hero.jpg', points: 15, base: '₹2.00 Cr', age: 36, category: 'Top-Order Batter', strikeRate: '132.8', economy: '—' },
      { name: 'Rajat Patidar', sub: 'Aggressive Top-Order · ₹11.00 Cr', role: 'Batter', flag: '🇮🇳', img: '/images/player_hero.jpg', points: 13, base: '₹1.50 Cr', age: 31, category: 'Top-Order Batter', strikeRate: '158.0', economy: '—' },
      { name: 'Cameron Green', sub: 'Pace All-Rounder · ₹17.50 Cr', role: 'All-Rounder', flag: '🇦🇺', img: '/images/player_bowler.jpg', points: 14, base: '₹2.00 Cr', age: 26, category: 'Pace All-Rounder', strikeRate: '153.2', economy: '8.60' },
      { name: 'Mohammed Siraj', sub: 'Express Fast Bowler · ₹7.00 Cr', role: 'Bowler', flag: '🇮🇳', img: '/images/player_bowler.jpg', points: 13, base: '₹1.50 Cr', age: 31, category: 'Fast Bowler', strikeRate: '—', economy: '8.45' },
      { name: 'Yash Dayal', sub: 'Left-Arm Seam · ₹5.00 Cr', role: 'Bowler', flag: '🇮🇳', img: '/images/player_bowler.jpg', points: 12, base: '₹1.00 Cr', age: 27, category: 'Seam Bowler', strikeRate: '—', economy: '8.80' }
    ]
  },
  'KKR': {
    name: 'Kolkata Knight Riders',
    logo: '/teams/KKR.png',
    players: [
      { name: 'Rinku Singh', sub: 'Finisher Superstar · ₹13.00 Cr', role: 'Batter', flag: '🇮🇳', img: '/images/player_hero.jpg', points: 14, base: '₹2.00 Cr', age: 27, category: 'Finisher', strikeRate: '149.5', economy: '—' },
      { name: 'Andre Russell', sub: 'Dre Russ Destruction · ₹12.00 Cr', role: 'All-Rounder', flag: '🇯🇲', img: '/images/player_bowler.jpg', points: 14, base: '₹2.00 Cr', age: 37, category: 'Pace All-Rounder', strikeRate: '174.9', economy: '9.20' },
      { name: 'Sunil Narine', sub: 'Mystery Spinner · ₹12.00 Cr', role: 'All-Rounder', flag: '🇹🇹', img: '/images/player_bowler.jpg', points: 14, base: '₹2.00 Cr', age: 37, category: 'Mystery Spinner', strikeRate: '165.8', economy: '6.73' },
      { name: 'Varun Chakaravarthy', sub: 'Mystery Spin Bowler · ₹12.00 Cr', role: 'Bowler', flag: '🇮🇳', img: '/images/player_bowler.jpg', points: 13, base: '₹1.50 Cr', age: 33, category: 'Spin Bowler', strikeRate: '—', economy: '7.30' },
      { name: 'Harshit Rana', sub: 'Fast Bowler · ₹4.00 Cr', role: 'Bowler', flag: '🇮🇳', img: '/images/player_bowler.jpg', points: 12, base: '₹1.00 Cr', age: 23, category: 'Fast Bowler', strikeRate: '—', economy: '8.90' }
    ]
  }
};

export default function Home() {
  const navigate = useNavigate();
  
  // Navigation & Screen state
  const [activeTab, setActiveTab] = useState<TabType>('teams');
  const [splashVisible, setSplashVisible] = useState(() => {
    return !sessionStorage.getItem('ca26_splash_seen');
  });
  const [splashReady, setSplashReady] = useState(false);
  const [connectionText, setConnectionText] = useState('Connecting to auction server...');

  // Data state
  const [user, setUser] = useState<any>(null);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  // Teams tab state (Image 1)
  const [selectedFranchise, setSelectedFranchise] = useState('CSK');
  const [teamsSubtab, setTeamsSubtab] = useState<'overview' | 'results' | 'matches'>('overview');

  // Player Profile Inspection state (Image 4)
  const [inspectedPlayer, setInspectedPlayer] = useState({
    name: 'Virat Kohli',
    role: 'Captain · Top-Order Batter',
    flag: '🇮🇳',
    teamCode: 'RCB',
    logoUrl: '/teams/RCB.png',
    img: '/images/player_hero.jpg',
    points: 15,
    base: '₹2.00 Cr',
    age: 36,
    category: 'Top-Order Batter',
    strikeRate: '132.8',
    economy: '—'
  });
  const [profileSubtab, setProfileSubtab] = useState<'overview' | 'stats' | 'career'>('overview');

  // Matches tab subfilter (Image 3)
  const [matchesFilter, setMatchesFilter] = useState<'live' | 'brackets' | 'finished'>('live');

  // Spotlight broadcast ticker
  const [spotlightSeconds, setSpotlightSeconds] = useState(12);
  const [spotlightIndex, setSpotlightIndex] = useState(0);

  const SPOTLIGHT_PLAYERS = [
    { name: 'Virat Kohli', role: 'Batter', points: 15, base: '₹2.00 Cr', bid: '18.5', team1: 'CSK', team2: 'RCB', round: 'ROUND 3' },
    { name: 'Rohit Sharma', role: 'Batter', points: 15, base: '₹2.00 Cr', bid: '21.0', team1: 'MI', team2: 'DC', round: 'ROUND 2' },
    { name: 'Jasprit Bumrah', role: 'Bowler', points: 15, base: '₹2.00 Cr', bid: '22.5', team1: 'MI', team2: 'KKR', round: 'ROUND 4' },
    { name: 'MS Dhoni', role: 'Wicket-Keeper', points: 15, base: '₹2.00 Cr', bid: '16.5', team1: 'CSK', team2: 'SRH', round: 'ROUND 1' },
    { name: 'Hardik Pandya', role: 'All-Rounder', points: 14, base: '₹2.00 Cr', bid: '19.25', team1: 'GT', team2: 'MI', round: 'ROUND 3' }
  ];

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ca26_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}

    safeFetch('/api/health')
      .then(() => {
        setConnectionText('Connection secured. Stadium live.');
        setSplashReady(true);
      })
      .catch(() => {
        setConnectionText('Connected in local arena mode.');
        setSplashReady(true);
      });

    const timer = setTimeout(() => {
      setSplashReady(true);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (activeTab === 'matches' || activeTab === 'rating') {
      fetchRooms();
    }
  }, [activeTab]);

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

  const handleSignOut = () => {
    localStorage.removeItem('ca26_token');
    localStorage.removeItem('ca26_user');
    setUser(null);
  };

  const openPlayerProfile = (p: any, teamCode: string, logoUrl: string) => {
    setInspectedPlayer({
      name: p.name,
      role: p.role,
      flag: p.flag,
      teamCode: teamCode,
      logoUrl: logoUrl,
      img: p.img || '/images/player_hero.jpg',
      points: p.points || 14,
      base: p.base || '₹2.00 Cr',
      age: p.age || 29,
      category: p.category || p.role,
      strikeRate: p.strikeRate || '142.5',
      economy: p.economy || '—'
    });
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentSpotlight = SPOTLIGHT_PLAYERS[spotlightIndex];
  const activeRoster = ROSTER_DATA[selectedFranchise] || ROSTER_DATA['CSK'];

  return (
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] font-['Inter',sans-serif] relative overflow-x-hidden select-none">
      
      {/* 1. Animated Cricket Splash Screen */}
      {splashVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090D16]/95 backdrop-blur-2xl transition-opacity duration-500">
          <div className="text-center w-full max-w-xs animate-fade-up">
            <div className="cricket-ball mb-6 cursor-pointer" onClick={handleStartFromSplash} title="Click to start"></div>
            
            <h1 className="text-3xl font-black tracking-tight font-['Outfit'] mb-2 text-[#DFE2EF]">
              CRICK<span className="text-[#10B981]">·</span>AUCTION
            </h1>
            <p className="text-[11px] text-[#86948A] mb-5 tracking-widest uppercase font-mono font-bold">
              IPL 2026 MULTIPLAYER ARENA
            </p>

            <div className="mb-4">
              <p className="text-xs text-[#10B981] font-bold mb-3 flex items-center justify-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping"></span>
                {connectionText}
              </p>
              
              {!splashReady ? (
                <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden w-48 mx-auto">
                  <div className="h-full bg-gradient-to-r from-[#10B981] to-[#4CD7F6] w-full animate-pulse"></div>
                </div>
              ) : (
                <GameButton
                  onClick={handleStartFromSplash}
                  variant="primary"
                  size="lg"
                  fullWidth
                  className="shadow-[0_0_24px_rgba(16,185,129,0.35)]"
                >
                  ENTER THE ARENA
                </GameButton>
              )}
            </div>

            <button
              onClick={handleStartFromSplash}
              className="text-[11px] text-[#86948A] hover:text-[#DFE2EF] transition mt-2 underline"
            >
              Skip intro
            </button>
          </div>
        </div>
      )}

      {/* Main Container - Mobile First App Shell */}
      <div className="max-w-md md:max-w-lg mx-auto min-h-screen relative flex flex-col pb-24 px-4 pt-3">
        
        {/* ========================================================================= */}
        {/* UNIFIED COMPACT TOP BAR (Tactical Pitch Command)                         */}
        {/* ========================================================================= */}
        <header className="flex justify-between items-center h-11 mb-3 pb-2 border-b border-[#1F2937]">
          <div 
            onClick={() => setActiveTab('teams')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-[6px] bg-[#111827] border border-[#1F2937] flex items-center justify-center shadow-md group-hover:border-[#10B981]/50 transition">
              <CricketBatBallIcon size={16} color="#10B981" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight font-['Outfit'] leading-none block text-[#DFE2EF]">
                Crick<span className="text-[#10B981]">Auction</span>
              </span>
              <span className="text-[9px] font-bold font-mono tracking-widest text-[#86948A] uppercase block mt-0.5">
                {activeTab === 'teams' ? 'FRANCHISE ROSTERS' : 
                 activeTab === 'rating' ? 'LEADERBOARD & STATS' :
                 activeTab === 'matches' ? 'TOURNAMENT FIXTURES' :
                 activeTab === 'play' ? 'ARENA LAUNCHPAD' : 'PLAYER PROFILE'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('matches')}
              className="w-8 h-8 rounded-[6px] bg-[#111827] border border-[#1F2937] hover:border-[#3C4A42] transition flex items-center justify-center text-[#86948A] hover:text-[#DFE2EF]"
              title="Search"
            >
              <Search size={15} />
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className="w-8 h-8 rounded-[6px] bg-[#111827] border border-[#1F2937] hover:border-[#3C4A42] transition flex items-center justify-center text-[#86948A] hover:text-[#DFE2EF]"
              title="Profile"
            >
              <User size={15} />
            </button>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* SCREEN 1: TEAMS & ROSTERS (Tactical Pitch Command)                        */}
        {/* ========================================================================= */}
        {activeTab === 'teams' && (
          <div className="space-y-4 animate-fade-up">
            
            {/* Centered Glowing Franchise Mascot Hero */}
            <div className="text-center py-2 relative">
              <div className="w-24 h-24 mx-auto mb-2 rounded-[6px] p-2.5 bg-[#111827] border border-[#1F2937] flex items-center justify-center relative shadow-[0_12px_32px_rgba(0,0,0,0.6)]">
                <div className="absolute inset-0 rounded-[6px] bg-gradient-to-t from-[#10B981]/15 to-transparent pointer-events-none" />
                <img 
                  src={activeRoster.logo} 
                  alt={activeRoster.name} 
                  className="max-h-full max-w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
                />
              </div>
              <h2 className="font-['Outfit'] font-extrabold text-lg text-[#DFE2EF]">
                {activeRoster.name}
              </h2>
              <p className="text-[11px] text-[#86948A] font-mono font-bold">
                10 Teams Circuit · IPL 2026 Edition
              </p>
            </div>

            {/* Subtabs: OVERVIEW / RESULTS / MATCHES with Emerald Active Line */}
            <div className="flex border-b border-[#1F2937] pb-1 gap-6 text-xs font-bold font-['Outfit'] uppercase tracking-wider">
              <button 
                onClick={() => setTeamsSubtab('overview')}
                className={`pb-2 transition ${teamsSubtab === 'overview' ? 'text-[#DFE2EF] border-b-2 border-[#10B981]' : 'text-[#86948A] hover:text-[#DFE2EF]'}`}
              >
                OVERVIEW
              </button>
              <button 
                onClick={() => setTeamsSubtab('results')}
                className={`pb-2 transition ${teamsSubtab === 'results' ? 'text-[#DFE2EF] border-b-2 border-[#10B981]' : 'text-[#86948A] hover:text-[#DFE2EF]'}`}
              >
                RESULTS
              </button>
              <button 
                onClick={() => setTeamsSubtab('matches')}
                className={`pb-2 transition ${teamsSubtab === 'matches' ? 'text-[#DFE2EF] border-b-2 border-[#10B981]' : 'text-[#86948A] hover:text-[#DFE2EF]'}`}
              >
                MATCHES
              </button>
            </div>

            {/* Franchise Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {['CSK', 'MI', 'RCB', 'KKR', 'DC', 'GT', 'RR', 'SRH'].map(code => (
                <button
                  key={code}
                  onClick={() => setSelectedFranchise(code)}
                  className={`px-3 py-1.5 rounded-[4px] text-xs font-extrabold font-['Outfit'] transition flex-shrink-0 ${
                    selectedFranchise === code 
                      ? 'bg-[#10B981] text-[#090D16] shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                      : 'bg-[#111827] text-[#86948A] border border-[#1F2937] hover:text-[#DFE2EF] hover:border-[#3C4A42]'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* Roster Cards List */}
            <div className="space-y-2">
              {activeRoster.players.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => openPlayerProfile(p, selectedFranchise, activeRoster.logo)}
                  className="p-3 bg-[#111827] border border-[#1F2937] hover:border-[#10B981]/50 rounded-[6px] flex items-center gap-3 cursor-pointer transition group shadow-sm hover:bg-[#1A2234]"
                >
                  {/* Player Avatar */}
                  <div className="w-12 h-12 rounded-[4px] bg-[#0F131C] border border-[#1F2937] overflow-hidden flex-shrink-0">
                    <img 
                      src={p.img} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                  </div>

                  {/* Player Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{p.flag}</span>
                      <span className="font-['Outfit'] font-bold text-sm text-[#DFE2EF] truncate">
                        {p.name}
                      </span>
                      {p.isCap && <span className="text-[#F59E0B] text-xs">👑</span>}
                    </div>
                    <div className="text-[11px] text-[#86948A] font-mono truncate mt-0.5">
                      {p.sub}
                    </div>
                  </div>

                  {/* Role Badge */}
                  <span className="bg-[#1C1F29] border border-[#1F2937] text-[#BBCABF] rounded-[3px] px-2 py-1 text-[10px] font-mono font-bold whitespace-nowrap">
                    {p.role}
                  </span>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: STANDINGS & LEADERBOARD (Tactical Pitch Command)                */}
        {/* ========================================================================= */}
        {activeTab === 'rating' && (
          <div className="space-y-4 animate-fade-up">
            
            {/* Live Broadcast Hero Card */}
            <div className="relative rounded-[6px] p-4 bg-[#111827] border border-[#1F2937] overflow-hidden shadow-xl">
              <div className="flex justify-between items-center text-[10px] mb-2">
                <LivePill label="LIVE BROADCAST" />
                <span className="font-mono font-bold text-[#10B981]">{currentSpotlight.round}</span>
              </div>

              <div className="grid grid-cols-3 items-center text-center py-2">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-[4px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-center p-1 mb-1">
                    <img src={`/teams/${currentSpotlight.team1}.png`} alt={currentSpotlight.team1} className="max-h-full object-contain" />
                  </div>
                  <b className="text-[11px] font-['Outfit'] font-bold text-[#DFE2EF]">{currentSpotlight.team1}</b>
                  <span className="text-[9px] font-mono text-[#86948A]">142 PTS</span>
                </div>

                <div>
                  <div className="text-[9px] font-mono font-bold text-[#86948A] uppercase">HIGH BID</div>
                  <div className="font-mono font-bold text-2xl text-[#DFE2EF]">
                    ₹{currentSpotlight.bid}<span className="text-xs text-[#10B981] ml-0.5">Cr</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold text-[#090D16] bg-[#10B981] px-2 py-0.5 rounded-[2px]">
                    {currentSpotlight.team1} LEADING
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-[4px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-center p-1 mb-1">
                    <img src={`/teams/${currentSpotlight.team2}.png`} alt={currentSpotlight.team2} className="max-h-full object-contain" />
                  </div>
                  <b className="text-[11px] font-['Outfit'] font-bold text-[#DFE2EF]">{currentSpotlight.team2}</b>
                  <span className="text-[9px] font-mono text-[#86948A]">136 PTS</span>
                </div>
              </div>
            </div>

            {/* Standings Title Strip */}
            <div className="flex justify-between items-center text-xs font-mono font-bold text-[#86948A] px-1 uppercase tracking-wider">
              <span>TEAM STANDINGS</span>
              <span>RATING / PURSE</span>
            </div>

            {/* Ranking Cards 1 to 6 */}
            <div className="space-y-2">
              {[
                { rank: 1, code: 'CSK', name: 'Chennai Super Kings', delta: '+1420', up: true, purse: '₹82.50 Cr', flag: '🇮🇳' },
                { rank: 2, code: 'MI', name: 'Mumbai Indians', delta: '+1285', up: true, purse: '₹76.00 Cr', flag: '🇮🇳' },
                { rank: 3, code: 'RCB', name: 'Royal Challengers Bengaluru', delta: '-1195', up: false, purse: '₹91.20 Cr', flag: '🇮🇳' },
                { rank: 4, code: 'KKR', name: 'Kolkata Knight Riders', delta: '+1140', up: true, purse: '₹68.50 Cr', flag: '🇮🇳' },
                { rank: 5, code: 'GT', name: 'Gujarat Titans', delta: '-980', up: false, purse: '₹104.00 Cr', flag: '🇮🇳' },
                { rank: 6, code: 'SRH', name: 'Sunrisers Hyderabad', delta: '-860', up: false, purse: '₹98.00 Cr', flag: '🇮🇳' }
              ].map(t => (
                <div 
                  key={t.rank}
                  className="p-3 bg-[#111827] border border-[#1F2937] hover:border-[#10B981]/40 hover:bg-[#1A2234] rounded-[6px] flex items-center gap-3 transition shadow-sm"
                >
                  <span className="w-5 text-center font-mono font-bold text-xs text-[#86948A]">
                    {t.rank}
                  </span>

                  <div className="w-9 h-9 rounded-[4px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-center p-1.5 flex-shrink-0">
                    <img src={`/teams/${t.code}.png`} alt={t.code} className="max-h-full max-w-full object-contain" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="font-['Outfit'] font-bold text-sm text-[#DFE2EF] truncate flex items-center gap-1.5">
                      <span>{t.flag}</span>
                      <span>{t.name}</span>
                    </div>
                    <div className="text-[11px] text-[#86948A] font-mono mt-0.5">
                      Purse: <b className="text-[#DFE2EF]">{t.purse}</b>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className={`text-xs font-mono font-bold flex items-center justify-end gap-0.5 ${t.up ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {t.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span>{t.delta}</span>
                    </div>
                    <span className="text-[10px] text-[#86948A] font-mono font-medium">POINTS</span>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: MATCHES & BRACKETS (Tactical Pitch Command)                     */}
        {/* ========================================================================= */}
        {activeTab === 'matches' && (
          <div className="space-y-4 animate-fade-up">
            
            {/* Filter Pills */}
            <div className="flex gap-2 mb-1">
              <button
                onClick={() => setMatchesFilter('live')}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-bold font-['Outfit'] transition ${
                  matchesFilter === 'live' ? 'bg-[#10B981] text-[#090D16] shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-[#111827] text-[#86948A] border border-[#1F2937] hover:text-[#DFE2EF]'
                }`}
              >
                Live Arenas ({publicRooms.length})
              </button>
              <button
                onClick={() => setMatchesFilter('brackets')}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-bold font-['Outfit'] transition ${
                  matchesFilter === 'brackets' ? 'bg-[#10B981] text-[#090D16] shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-[#111827] text-[#86948A] border border-[#1F2937] hover:text-[#DFE2EF]'
                }`}
              >
                Tournament Brackets
              </button>
              <button 
                onClick={() => navigate('/create')} 
                className="ml-auto text-xs bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2.5 py-1.5 rounded-[4px] font-bold font-['Outfit'] hover:bg-[#10B981]/25 transition"
              >
                ＋ Host
              </button>
            </div>

            {/* TAB: LIVE ARENAS */}
            {matchesFilter === 'live' && (
              <div className="space-y-2.5">
                {publicRooms.length === 0 ? (
                  <div className="p-6 text-center bg-[#111827] border border-[#1F2937] rounded-[6px]">
                    <p className="text-xs text-[#86948A] mb-3 font-mono">No active public rooms right now.</p>
                    <GameButton
                      onClick={() => navigate('/create')}
                      variant="primary"
                      size="sm"
                    >
                      CREATE NEW ARENA
                    </GameButton>
                  </div>
                ) : (
                  publicRooms.map((r: any) => (
                    <div 
                      key={r.room_code}
                      className="p-3.5 bg-[#111827] border border-[#1F2937] rounded-[6px] hover:border-[#10B981]/40 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-[#10B981] text-xs">#{r.room_code}</span>
                          <span className="text-[10px] text-[#10B981] font-mono font-bold">● {r.status || 'LOBBY'}</span>
                        </div>
                        <h4 className="font-['Outfit'] font-bold text-sm text-[#DFE2EF]">{r.room_name}</h4>
                        <span className="text-[11px] text-[#86948A] font-mono">Purse: {formatCr(r.starting_purse_lakhs || 12000)} · Max: {r.max_teams || 10}</span>
                      </div>
                      <GameButton
                        onClick={() => navigate(`/room/${r.room_code}`)}
                        variant="primary"
                        size="sm"
                      >
                        JOIN
                      </GameButton>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: BRACKETS VIEW */}
            {matchesFilter === 'brackets' && (
              <div className="space-y-2.5">
                <div className="p-3.5 bg-[#111827] border border-[#1F2937] rounded-[6px]">
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold text-[#86948A] mb-3 uppercase">
                    <span>PLAYOFF SEMI-FINAL · BO3</span>
                    <span className="text-[#10B981]">19:30 IST</span>
                  </div>

                  {/* Match Bracket Pair */}
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-[4px] bg-[#10B981] text-[#090D16] flex items-center justify-between shadow-md">
                      <div className="flex items-center gap-2">
                        <img src="/teams/CSK.png" alt="CSK" className="w-5 h-5 object-contain" />
                        <span className="font-['Outfit'] font-extrabold text-sm">Chennai Super Kings</span>
                      </div>
                      <span className="font-mono font-bold text-sm">2</span>
                    </div>

                    <div className="p-2.5 rounded-[4px] bg-[#0F131C] border border-[#1F2937] text-[#86948A] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src="/teams/MI.png" alt="MI" className="w-5 h-5 object-contain" />
                        <span className="font-['Outfit'] font-bold text-sm text-[#DFE2EF]">Mumbai Indians</span>
                      </div>
                      <span className="font-mono font-bold text-sm">1</span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-[#111827] border border-[#1F2937] rounded-[6px]">
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold text-[#86948A] mb-3 uppercase">
                    <span>SEMI-FINAL 2 · BO3</span>
                    <span className="text-[#06B6D4]">UPCOMING</span>
                  </div>

                  <div className="space-y-2">
                    <div className="p-2.5 rounded-[4px] bg-[#0F131C] border border-[#1F2937] text-[#DFE2EF] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src="/teams/RCB.png" alt="RCB" className="w-5 h-5 object-contain" />
                        <span className="font-['Outfit'] font-bold text-sm">Royal Challengers</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-[#86948A]">—</span>
                    </div>

                    <div className="p-2.5 rounded-[4px] bg-[#0F131C] border border-[#1F2937] text-[#DFE2EF] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img src="/teams/KKR.png" alt="KKR" className="w-5 h-5 object-contain" />
                        <span className="font-['Outfit'] font-bold text-sm">Kolkata Knight Riders</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-[#86948A]">—</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 4: PLAY ARENA LAUNCHPAD                                            */}
        {/* ========================================================================= */}
        {activeTab === 'play' && (
          <div className="space-y-3 animate-fade-up">
            
            <div 
              onClick={() => navigate('/create')}
              className="p-4 bg-[#111827] border border-[#10B981]/30 hover:border-[#10B981] rounded-[6px] flex items-center gap-3.5 cursor-pointer transition group shadow-md hover:bg-[#1A2234]"
            >
              <div className="w-11 h-11 rounded-[4px] bg-[#10B981]/15 text-[#10B981] flex items-center justify-center text-xl font-bold group-hover:scale-105 transition">
                <GavelIcon size={20} color="#10B981" />
              </div>
              <div>
                <b className="font-bold text-sm font-['Outfit'] text-[#DFE2EF] block">Host Tournament Room</b>
                <small className="text-xs text-[#86948A] block mt-0.5">Configure franchise slots, purse, timers & AI bots.</small>
              </div>
              <ChevronRight size={18} className="ml-auto text-[#10B981]" />
            </div>

            <div 
              onClick={() => navigate('/join')}
              className="p-4 bg-[#111827] border border-[#1F2937] hover:border-[#06B6D4] rounded-[6px] flex items-center gap-3.5 cursor-pointer transition group shadow-md hover:bg-[#1A2234]"
            >
              <div className="w-11 h-11 rounded-[4px] bg-[#06B6D4]/15 text-[#06B6D4] flex items-center justify-center text-xl font-bold group-hover:scale-105 transition">
                <ShieldCrestIcon size={20} color="#06B6D4" />
              </div>
              <div>
                <b className="font-bold text-sm font-['Outfit'] text-[#DFE2EF] block">Join With Invite Code</b>
                <small className="text-xs text-[#86948A] block mt-0.5">Enter a 6-character room code to join an active arena.</small>
              </div>
              <ChevronRight size={18} className="ml-auto text-[#06B6D4]" />
            </div>

            <div 
              onClick={() => navigate('/create')}
              className="p-4 bg-[#111827] border border-purple-500/30 hover:border-purple-400 rounded-[6px] flex items-center gap-3.5 cursor-pointer transition group shadow-md hover:bg-[#1A2234]"
            >
              <div className="w-11 h-11 rounded-[4px] bg-purple-500/15 text-purple-300 flex items-center justify-center text-xl font-bold group-hover:scale-105 transition">
                <BotsAiIcon size={20} color="#D8B4FE" />
              </div>
              <div>
                <b className="font-bold text-sm font-['Outfit'] text-[#DFE2EF] block">Solo vs AI Bidding Bots</b>
                <small className="text-xs text-[#86948A] block mt-0.5">Practice strategy against Easy, Medium, or Hard bots.</small>
              </div>
              <span className="ml-auto text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-[2px]">
                SOLO
              </span>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 5: HERO PLAYER PROFILE (Tactical Pitch Command)                   */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-fade-up">
            
            {/* Studio Portrait Hero with Floating Team Badge */}
            <div className="p-6 text-center bg-[#111827] border border-[#1F2937] rounded-[8px] relative shadow-xl">
              <div className="relative w-32 h-36 mx-auto mb-3">
                <img 
                  src={inspectedPlayer.img} 
                  alt={inspectedPlayer.name}
                  className="w-full h-full object-cover rounded-[6px] border border-[#1F2937] shadow-[0_12px_28px_rgba(0,0,0,0.7)]" 
                />
                <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-[4px] bg-[#0F131C] border border-[#1F2937] p-1 flex items-center justify-center shadow-lg">
                  <img src={inspectedPlayer.logoUrl} alt={inspectedPlayer.teamCode} className="max-w-full max-h-full object-contain" />
                </div>
              </div>

              <h2 className="font-['Outfit'] font-extrabold text-2xl text-[#DFE2EF] flex items-center justify-center gap-1.5">
                <span className="text-[#10B981] text-lg">🏏</span>
                <span>{inspectedPlayer.name}</span>
              </h2>

              <div className="flex justify-center gap-2 mt-2">
                <span className="bg-[#1C1F29] border border-[#1F2937] text-[#BBCABF] text-[11px] font-mono font-bold px-2.5 py-1 rounded-[3px]">
                  {inspectedPlayer.role.split('·')[0].trim()}
                </span>
                <span className="bg-[#F59E0B]/15 border border-[#F59E0B]/35 text-[#FFB95F] text-[11px] font-mono font-bold px-2.5 py-1 rounded-[3px]">
                  ★ {inspectedPlayer.points} PTS
                </span>
              </div>
            </div>

            {/* Subtabs: OVERVIEW / STATS / CAREER */}
            <div className="flex border-b border-[#1F2937] pb-1 gap-6 text-xs font-bold font-['Outfit'] uppercase tracking-wider">
              <button 
                onClick={() => setProfileSubtab('overview')}
                className={`pb-2 transition ${profileSubtab === 'overview' ? 'text-[#DFE2EF] border-b-2 border-[#10B981]' : 'text-[#86948A] hover:text-[#DFE2EF]'}`}
              >
                OVERVIEW
              </button>
              <button 
                onClick={() => setProfileSubtab('stats')}
                className={`pb-2 transition ${profileSubtab === 'stats' ? 'text-[#DFE2EF] border-b-2 border-[#10B981]' : 'text-[#86948A] hover:text-[#DFE2EF]'}`}
              >
                AUCTION STATS
              </button>
              <button 
                onClick={() => setProfileSubtab('career')}
                className={`pb-2 transition ${profileSubtab === 'career' ? 'text-[#DFE2EF] border-b-2 border-[#10B981]' : 'text-[#86948A] hover:text-[#DFE2EF]'}`}
              >
                CAREER
              </button>
            </div>

            {/* Biographical Key-Value Detail Rows */}
            <div className="p-4 bg-[#111827] border border-[#1F2937] rounded-[6px] divide-y divide-[#1F2937] text-xs">
              <div className="flex justify-between py-2.5">
                <span className="text-[#86948A]">Full Name</span>
                <b className="text-[#DFE2EF] font-['Outfit']">{inspectedPlayer.name}</b>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-[#86948A]">Age</span>
                <b className="text-[#DFE2EF] font-mono">{inspectedPlayer.age} Years</b>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-[#86948A]">Base Price</span>
                <b className="text-[#10B981] font-mono font-bold">{inspectedPlayer.base}</b>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-[#86948A]">Primary Role</span>
                <b className="text-[#DFE2EF]">{inspectedPlayer.category}</b>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-[#86948A]">Status</span>
                <b className="text-[#06B6D4] font-mono">{inspectedPlayer.flag} Domestic</b>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-[#86948A]">T20 Strike Rate</span>
                <b className="text-[#DFE2EF] font-mono">{inspectedPlayer.strikeRate}</b>
              </div>
              {inspectedPlayer.economy !== '—' && (
                <div className="flex justify-between py-2.5">
                  <span className="text-[#86948A]">Economy Rate</span>
                  <b className="text-[#DFE2EF] font-mono">{inspectedPlayer.economy}</b>
                </div>
              )}
            </div>

            {/* Account Controls */}
            {user ? (
              <GameButton
                onClick={handleSignOut}
                variant="danger"
                size="md"
                fullWidth
                icon={<LogOut size={16} />}
              >
                SIGN OUT ({user.username})
              </GameButton>
            ) : (
              <GameButton
                onClick={() => navigate('/login')}
                variant="primary"
                size="md"
                fullWidth
                icon={<LogIn size={16} />}
              >
                SIGN IN / REGISTER PROFILE
              </GameButton>
            )}

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 2. FIXED BOTTOM TACTICAL COMMAND DOCK (Exact Replica of Image Component)   */}
      {/* ========================================================================= */}
      <div className="fixed bottom-3 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto h-14 bg-[#1C1F29]/95 backdrop-blur-xl border border-[#262A34] rounded-[10px] px-2.5 flex items-center gap-1.5 sm:gap-3 shadow-[0_12px_28px_-6px_rgba(0,0,0,0.7)] max-w-md w-full justify-around">
          
          {/* Tab 1: Rating (Leaderboard) */}
          <button
            onClick={() => { setActiveTab('rating'); window.scrollTo(0, 0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition ${
              activeTab === 'rating' 
                ? 'bg-[#10B981] text-[#090D16] font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]' 
                : 'text-[#86948A] hover:text-[#DFE2EF]'
            }`}
          >
            <Trophy size={17} />
            {activeTab === 'rating' && <span className="text-[11px] font-['Outfit'] font-bold uppercase tracking-wider">Rating</span>}
          </button>

          {/* Tab 2: Matches (Fixtures) */}
          <button
            onClick={() => { setActiveTab('matches'); window.scrollTo(0, 0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition ${
              activeTab === 'matches' 
                ? 'bg-[#10B981] text-[#090D16] font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]' 
                : 'text-[#86948A] hover:text-[#DFE2EF]'
            }`}
          >
            <CricketBatBallIcon size={17} color={activeTab === 'matches' ? '#090D16' : '#86948A'} />
            {activeTab === 'matches' && <span className="text-[11px] font-['Outfit'] font-bold uppercase tracking-wider">Matches</span>}
          </button>

          {/* Tab 3: Teams (Rosters) */}
          <button
            onClick={() => { setActiveTab('teams'); window.scrollTo(0, 0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition ${
              activeTab === 'teams' 
                ? 'bg-[#10B981] text-[#090D16] font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]' 
                : 'text-[#86948A] hover:text-[#DFE2EF]'
            }`}
          >
            <ShieldCrestIcon size={17} color={activeTab === 'teams' ? '#090D16' : '#86948A'} />
            {activeTab === 'teams' && <span className="text-[11px] font-['Outfit'] font-bold uppercase tracking-wider">Teams</span>}
          </button>

          {/* Tab 4: Play (Live Bid / Launchpad) */}
          <button
            onClick={() => { setActiveTab('play'); window.scrollTo(0, 0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition ${
              activeTab === 'play' 
                ? 'bg-[#10B981] text-[#090D16] font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]' 
                : 'text-[#86948A] hover:text-[#DFE2EF]'
            }`}
          >
            <GavelIcon size={17} color={activeTab === 'play' ? '#090D16' : '#86948A'} />
            {activeTab === 'play' && <span className="text-[11px] font-['Outfit'] font-bold uppercase tracking-wider">Live Bid</span>}
          </button>

          {/* Tab 5: Profile */}
          <button
            onClick={() => { setActiveTab('profile'); window.scrollTo(0, 0); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] transition ${
              activeTab === 'profile' 
                ? 'bg-[#10B981] text-[#090D16] font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]' 
                : 'text-[#86948A] hover:text-[#DFE2EF]'
            }`}
          >
            <User size={17} />
            {activeTab === 'profile' && <span className="text-[11px] font-['Outfit'] font-bold uppercase tracking-wider">Profile</span>}
          </button>

        </nav>
      </div>

    </div>
  );
}
