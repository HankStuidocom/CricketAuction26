import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { 
  ALL_FRANCHISES, 
  FRANCHISE_MAP, 
  formatCr 
} from '../lib/utils';
import { safeFetch, getSocketUrl, warmupServer } from '../lib/api';
import GameButton from '../components/GameButton';
import GamePanel from '../components/GamePanel';
import { 
  CricketBatBallIcon, 
  GavelIcon, 
  PurseCoinsIcon, 
  TrophyCupIcon, 
  CrownHostIcon, 
  ShieldCrestIcon, 
  BotsAiIcon, 
  CheckmarkIcon
} from '../components/GameIcons';
import { 
  Home as HomeIcon,
  Layers,
  Play,
  Users,
  User,
  Search,
  ArrowLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Eye,
  RefreshCw,
  Trophy
} from 'lucide-react';

export type TabType = 'home' | 'matches' | 'play' | 'friends' | 'profile';

// Pre-configured rich roster data for all franchises
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
  
  // Navigation & Screen state - Default tab is 'home'
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [splashVisible, setSplashVisible] = useState(() => {
    return !sessionStorage.getItem('ca26_splash_seen');
  });

  // Data state
  const [user, setUser] = useState<any>(null);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Friends / Teams sub-state
  const [selectedFranchise, setSelectedFranchise] = useState('CSK');
  const [friendsSubtab, setFriendsSubtab] = useState<'overview' | 'results' | 'matches'>('overview');

  // Player Profile Inspection state
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

  // Matches tab filter
  const [matchesFilter, setMatchesFilter] = useState<'live' | 'brackets' | 'finished'>('live');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ca26_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}

    warmupServer();
    fetchRooms();

    // Real-time synchronization using Socket.IO
    const token = localStorage.getItem('ca26_token');
    const socket = io(getSocketUrl(), { auth: { token } });

    socket.on('room_state', () => {
      fetchRooms();
    });
    socket.on('auction_started', () => {
      fetchRooms();
    });
    socket.on('auction_completed', () => {
      fetchRooms();
    });

    // Gentle polling interval while on Home tab
    const pollInterval = setInterval(() => {
      fetchRooms();
    }, 5000);

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
    };
  }, []);

  const fetchRooms = async () => {
    setRoomsLoading(true);
    try {
      const rooms = await safeFetch<any[]>('/api/rooms');
      setPublicRooms(Array.isArray(rooms) ? rooms : []);
    } catch {
      // Retain existing state if temporary network error
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

  const activeRoster = ROSTER_DATA[selectedFranchise] || ROSTER_DATA['CSK'];

  // FILTER RULES: Public & Currently Live Rooms ONLY
  const publicLiveRooms = publicRooms.filter(r => {
    const isPublic = !r.is_private || r.is_private === 0;
    const isLive = r.status === 'IN_PROGRESS';
    return isPublic && isLive;
  });

  // Filtered rooms if user typed in search bar
  const displayedLiveRooms = publicLiveRooms.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.room_name?.toLowerCase().includes(q) ||
      r.room_code?.toLowerCase().includes(q) ||
      r.host_user?.display_name?.toLowerCase().includes(q) ||
      r.host_franchise?.toLowerCase().includes(q)
    );
  });

  // Top Featured Room (Topmost active public live room)
  const featuredRoom = publicLiveRooms[0] || null;

  // Derive dynamic leaderboard & high bid from real room data
  const leadingTeam = featuredRoom?.leading_team || { franchise_id: featuredRoom?.host_franchise || 'CSK', points: 0 };
  const runnerUpTeam = featuredRoom?.runner_up_team || { franchise_id: 'GT', points: 0 };
  const leadingFranchise = FRANCHISE_MAP[leadingTeam.franchise_id] || ALL_FRANCHISES[0];
  const runnerUpFranchise = FRANCHISE_MAP[runnerUpTeam.franchise_id] || ALL_FRANCHISES[8] || ALL_FRANCHISES[0];
  const highBidDisplay = formatCr(featuredRoom?.highest_bid_lakhs || featuredRoom?.current_bid_lakhs || 0);

  return (
    <div className="min-h-screen bg-[#090D16] text-[#DFE2EF] font-sans relative overflow-x-hidden select-none">
      
      {/* 1. Animated Cricket Splash Screen */}
      {splashVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090D16]/95 backdrop-blur-2xl transition-opacity duration-500">
          <div className="text-center w-full max-w-xs animate-fade-up">
            <div className="cricket-ball mb-6 cursor-pointer" onClick={handleStartFromSplash} title="Click to start"></div>
            
            <h1 className="text-3xl font-black tracking-tight font-display mb-2 text-[#DFE2EF]">
              CRICK<span className="text-[#10B981]">·</span>AUCTION
            </h1>
            <p className="text-[11px] text-[#86948A] mb-5 tracking-widest uppercase font-mono font-bold">
              IPL 2026 MULTIPLAYER ARENA
            </p>

            <button
              onClick={handleStartFromSplash}
              className="w-full py-3 bg-[#10B981] hover:bg-[#059669] text-[#090D16] rounded-[6px] font-display font-extrabold text-sm uppercase tracking-wider transition-all shadow-[0_0_24px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95"
            >
              ENTER ARENA
            </button>
          </div>
        </div>
      )}

      {/* Main Container - Mobile First App Shell */}
      <div className="max-w-md md:max-w-lg mx-auto min-h-screen relative flex flex-col pb-24 px-4 pt-3">
        
        {/* ========================================================================= */}
        {/* TOP HEADER (Exact Sketch: Logo + Cricket Auction / Live Match + Icons)    */}
        {/* ========================================================================= */}
        <header className="flex justify-between items-center h-12 mb-3 pb-2 border-b border-[#1F2937]">
          <div 
            onClick={() => { setActiveTab('home'); window.scrollTo(0, 0); }}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-[6px] bg-[#111827] border border-[#1F2937] flex items-center justify-center shadow-md group-hover:border-[#10B981]/50 transition">
              <CricketBatBallIcon size={18} color="#10B981" />
            </div>
            <div>
              <span className="font-display font-extrabold text-base sm:text-lg tracking-tight leading-none block text-[#DFE2EF]">
                Cricket Auction
              </span>
              <span className="text-[10px] font-bold font-mono tracking-wider text-[#10B981] uppercase block mt-0.5">
                {activeTab === 'home' ? 'Live Match' : 
                 activeTab === 'matches' ? 'Match Cards' :
                 activeTab === 'play' ? 'Arena Launchpad' :
                 activeTab === 'friends' ? 'Franchise Friends' : 'Commander Profile'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(prev => !prev)}
              className={`w-9 h-9 rounded-[6px] border transition flex items-center justify-center ${
                showSearch 
                  ? 'bg-[#10B981] text-[#090D16] border-[#10B981]' 
                  : 'bg-[#111827] border-[#1F2937] text-[#86948A] hover:text-[#DFE2EF] hover:border-[#3C4A42]'
              }`}
              title="Search Live Rooms"
            >
              <Search size={16} />
            </button>
            <button
              onClick={() => { setActiveTab('profile'); window.scrollTo(0, 0); }}
              className={`w-9 h-9 rounded-[6px] border transition flex items-center justify-center ${
                activeTab === 'profile' 
                  ? 'bg-[#10B981] text-[#090D16] border-[#10B981]' 
                  : 'bg-[#111827] border-[#1F2937] text-[#86948A] hover:text-[#DFE2EF] hover:border-[#3C4A42]'
              }`}
              title="Profile"
            >
              <User size={16} />
            </button>
          </div>
        </header>

        {/* Collapsible Search Bar */}
        {showSearch && (
          <div className="mb-3 animate-fade-down">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86948A]" />
              <input
                type="text"
                placeholder="Search live playing teams, rooms, owners..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#111827] border border-[#1F2937] focus:border-[#10B981] rounded-[6px] pl-9 pr-8 py-2 text-xs text-[#DFE2EF] focus:outline-none font-sans placeholder-[#86948A]"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#86948A] hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: HOME (Exact Match to User Hand-Drawn Sketch)                       */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-fade-up">

            {/* A. FEATURED LIVE MATCH CARD (Top Section of Sketch) */}
            {featuredRoom ? (
              <div className="rounded-[8px] bg-[#111827] border border-[#1F2937] p-4 relative shadow-[0_12px_32px_rgba(0,0,0,0.6)] overflow-hidden">
                {/* Subtle Pitch Glow */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-[#10B981]/10 rounded-full blur-2xl pointer-events-none" />

                {/* Top Information Row */}
                <div className="flex items-start justify-between mb-3 relative z-10">
                  {/* Left: Red indicator + Live label + Auction Mode */}
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-[11px] font-mono font-bold tracking-wider shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping inline-block"></span>
                      <span>Live</span>
                    </div>
                    <div className="text-xs font-mono font-bold text-[#86948A] mt-1.5 tracking-tight">
                      Mode : <span className="text-[#DFE2EF]">{featuredRoom.player_pool || 'IPL Auction 26'}</span>
                    </div>
                  </div>

                  {/* Right: Spec Button + Team Availability */}
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => navigate(`/room/${featuredRoom.room_code}/auction?spectate=true`, { state: { spectator: true } })}
                      className="px-3.5 py-1 rounded-[4px] bg-[#0F131C] border border-[#10B981] hover:bg-[#10B981] text-[#10B981] hover:text-[#090D16] font-display font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-sm"
                      title="Spectate Live Match"
                    >
                      Spec
                    </button>
                    <span className="text-xs font-mono font-bold text-[#DFE2EF]">
                      {featuredRoom.teams_count || featuredRoom.participants?.length || 0}/{featuredRoom.max_teams || 10} Teams
                    </span>
                  </div>
                </div>

                {/* Center Leaderboard Section */}
                <div className="py-2.5 px-2 rounded-[6px] bg-[#0F131C]/80 border border-[#1F2937] flex items-center justify-between relative z-10">
                  
                  {/* Leading Team (Left side) */}
                  <div className="flex flex-col items-center text-center w-24 sm:w-28 flex-shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[6px] bg-[#111827] border border-[#1F2937] p-1.5 flex items-center justify-center shadow-inner">
                      {leadingFranchise?.logoUrl ? (
                        <img 
                          src={leadingFranchise.logoUrl} 
                          alt={leadingTeam.franchise_id} 
                          className="max-h-full max-w-full object-contain drop-shadow" 
                        />
                      ) : (
                        <span className="text-2xl">{leadingFranchise?.emoji || '🦁'}</span>
                      )}
                    </div>
                    <span className="font-display font-black text-xs sm:text-sm text-white mt-1.5 leading-tight">
                      {leadingTeam.franchise_id}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#10B981] mt-0.5">
                      {leadingTeam.franchise_id} — {leadingTeam.points || 0} PT
                    </span>
                  </div>

                  {/* Center Leaderboard Information */}
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#86948A] font-bold">
                      High Bid
                    </span>
                    <div className="text-2xl sm:text-3xl font-mono font-black text-white tracking-tight my-0.5">
                      {highBidDisplay}
                    </div>
                    <div className="text-xs sm:text-sm font-display font-extrabold uppercase tracking-wider text-[#10B981]">
                      {leadingTeam.franchise_id} LEADING
                    </div>
                  </div>

                  {/* Runner-up Team (Right side) */}
                  <div className="flex flex-col items-center text-center w-24 sm:w-28 flex-shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-[6px] bg-[#111827] border border-[#1F2937] p-1.5 flex items-center justify-center shadow-inner">
                      {runnerUpFranchise?.logoUrl ? (
                        <img 
                          src={runnerUpFranchise.logoUrl} 
                          alt={runnerUpTeam.franchise_id} 
                          className="max-h-full max-w-full object-contain drop-shadow" 
                        />
                      ) : (
                        <span className="text-2xl">{runnerUpFranchise?.emoji || '⚡'}</span>
                      )}
                    </div>
                    <span className="font-display font-black text-xs sm:text-sm text-white mt-1.5 leading-tight">
                      {runnerUpTeam.franchise_id}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#06B6D4] mt-0.5">
                      {runnerUpTeam.franchise_id} — {runnerUpTeam.points || 0} PT
                    </span>
                  </div>

                </div>

              </div>
            ) : (
              /* Empty State for Featured Live Match */
              <div className="rounded-[8px] bg-[#111827] border border-[#1F2937] p-6 text-center shadow-md">
                <div className="inline-flex p-3 rounded-[6px] bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] mb-3">
                  <span className="w-3 h-3 rounded-full bg-[#EF4444] animate-ping mr-2 self-center"></span>
                  <span className="font-display font-bold text-xs uppercase tracking-wider">No Live Matches Right Now</span>
                </div>
                <h3 className="font-display font-extrabold text-base text-white">
                  Stadium Arena is Currently Open
                </h3>
                <p className="text-xs text-[#86948A] mt-1 max-w-xs mx-auto">
                  Public auction rooms will appear here dynamically as soon as a live auction commences.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <GameButton
                    onClick={() => navigate('/create')}
                    variant="primary"
                    size="sm"
                  >
                    HOST LIVE ARENA
                  </GameButton>
                  <GameButton
                    onClick={() => navigate('/join')}
                    variant="secondary"
                    size="sm"
                  >
                    ENTER ROOM CODE
                  </GameButton>
                </div>
              </div>
            )}

            {/* B. LIVE MATCH ROOM LIST (Heading & Cards Matching Sketch) */}
            <div className="space-y-2.5 pt-1">
              
              {/* Headings: LIVE PLAYING TEAMS on Left, Team Avaliable on Right */}
              <div className="flex justify-between items-center px-1">
                <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-[#86948A]">
                  LIVE PLAYING TEAMS
                </h3>
                <span className="font-display font-bold text-xs text-[#86948A]">
                  Team Available
                </span>
              </div>

              {/* Room Cards List */}
              {roomsLoading && publicLiveRooms.length === 0 ? (
                <div className="p-8 text-center bg-[#111827] border border-[#1F2937] rounded-[6px]">
                  <RefreshCw size={20} className="animate-spin text-[#10B981] mx-auto mb-2" />
                  <span className="text-xs text-[#86948A] font-mono">Syncing active tournament rooms...</span>
                </div>
              ) : displayedLiveRooms.length === 0 ? (
                <div className="p-6 text-center bg-[#111827] border border-[#1F2937] rounded-[6px]">
                  <p className="text-xs text-[#86948A] font-mono">
                    {searchQuery ? 'No rooms match your search query.' : 'No public live rooms active at this moment.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedLiveRooms.map((room, idx) => {
                    const hostUser = room.host_user;
                    const hostAvatar = hostUser?.avatar_emoji;
                    const rawPurse = room.host_purse_lakhs || room.starting_purse_lakhs || 12000;
                    const purseText = `${(rawPurse / 100).toFixed(0)}cr`;

                    return (
                      <div
                        key={room.id || room.room_code || idx}
                        className="p-3 bg-[#111827] border border-[#1F2937] hover:border-[#10B981]/50 rounded-[6px] flex items-center justify-between gap-3 transition shadow-sm"
                      >
                        {/* Left: Serial Number, Profile Icon, Room Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* 1. Serial Number */}
                          <span className="font-mono text-xs font-bold text-[#86948A] w-5 text-center flex-shrink-0">
                            {idx + 1}
                          </span>

                          {/* 2. Profile Icon */}
                          <div className="w-10 h-10 rounded-[4px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-center flex-shrink-0 text-lg shadow-inner">
                            {hostAvatar ? (
                              <span>{hostAvatar}</span>
                            ) : (
                              <User size={18} className="text-[#86948A]" />
                            )}
                          </div>

                          {/* 3. Room Information */}
                          <div className="min-w-0">
                            <div className="text-xs font-display font-bold text-white truncate">
                              Room Name : <span className="text-[#DFE2EF]">{room.room_name}</span>
                            </div>
                            <div className="text-[11px] font-mono text-[#86948A] mt-0.5">
                              Purse: <span className="text-[#10B981] font-bold">{purseText}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Spec Button and Team Availability */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* 4. Spec Button */}
                          <button
                            onClick={() => navigate(`/room/${room.room_code}/auction?spectate=true`, { state: { spectator: true } })}
                            className="px-3.5 py-1 rounded-[4px] bg-[#0F131C] border border-[#10B981] hover:bg-[#10B981] text-[#10B981] hover:text-[#090D16] font-display font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
                            title="Spectate Auction"
                          >
                            Spec
                          </button>

                          {/* 5. Team Availability */}
                          <span className="text-xs font-mono font-bold text-[#DFE2EF] min-w-[72px] text-right">
                            {room.teams_count || room.participants?.length || 0}/{room.max_teams || 10} Teams
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MATCHES (Tournament Fixtures & Brackets)                           */}
        {/* ========================================================================= */}
        {activeTab === 'matches' && (
          <div className="space-y-4 animate-fade-up">
            
            {/* Filter Pills */}
            <div className="flex gap-2 mb-1">
              <button
                onClick={() => setMatchesFilter('live')}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-bold font-display transition ${
                  matchesFilter === 'live' ? 'bg-[#10B981] text-[#090D16] shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-[#111827] text-[#86948A] border border-[#1F2937] hover:text-[#DFE2EF]'
                }`}
              >
                Live Match Cards ({publicLiveRooms.length})
              </button>
              <button
                onClick={() => setMatchesFilter('brackets')}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-bold font-display transition ${
                  matchesFilter === 'brackets' ? 'bg-[#10B981] text-[#090D16] shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-[#111827] text-[#86948A] border border-[#1F2937] hover:text-[#DFE2EF]'
                }`}
              >
                Tournament Brackets
              </button>
              <button 
                onClick={() => navigate('/create')} 
                className="ml-auto text-xs bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-2.5 py-1.5 rounded-[4px] font-bold font-display hover:bg-[#10B981]/25 transition"
              >
                ＋ Host
              </button>
            </div>

            {/* TAB: LIVE ARENAS */}
            {matchesFilter === 'live' && (
              <div className="space-y-2.5">
                {publicLiveRooms.length === 0 ? (
                  <div className="p-6 text-center bg-[#111827] border border-[#1F2937] rounded-[6px]">
                    <p className="text-xs text-[#86948A] mb-3 font-mono">No active public live matches right now.</p>
                    <GameButton
                      onClick={() => navigate('/create')}
                      variant="primary"
                      size="sm"
                    >
                      CREATE NEW ARENA
                    </GameButton>
                  </div>
                ) : (
                  publicLiveRooms.map((r: any) => (
                    <div 
                      key={r.room_code}
                      className="p-3.5 bg-[#111827] border border-[#1F2937] rounded-[6px] hover:border-[#10B981]/40 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-[#10B981] text-xs">#{r.room_code}</span>
                          <span className="text-[10px] text-[#10B981] font-mono font-bold">● LIVE</span>
                        </div>
                        <h4 className="font-display font-bold text-sm text-[#DFE2EF]">{r.room_name}</h4>
                        <span className="text-[11px] text-[#86948A] font-mono">Purse: {formatCr(r.starting_purse_lakhs || 12000)} · Max: {r.max_teams || 10}</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/room/${r.room_code}/auction?spectate=true`, { state: { spectator: true } })}
                          className="px-3 py-1.5 rounded-[4px] bg-[#0F131C] border border-[#10B981] text-[#10B981] font-display font-bold text-xs uppercase"
                        >
                          Spec
                        </button>
                        <GameButton
                          onClick={() => navigate(`/room/${r.room_code}`)}
                          variant="primary"
                          size="sm"
                        >
                          JOIN
                        </GameButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB: BRACKETS */}
            {matchesFilter === 'brackets' && (
              <div className="p-5 bg-[#111827] border border-[#1F2937] rounded-[6px] space-y-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#10B981]">
                  SEASON PLAYOFF BRACKET
                </span>
                <div className="space-y-2">
                  <div className="p-2.5 bg-[#0F131C] rounded-[4px] border border-[#1F2937] flex justify-between items-center text-xs">
                    <span className="font-display font-bold">Qualifier 1: CSK vs MI</span>
                    <span className="font-mono text-[#F59E0B]">Oct 24</span>
                  </div>
                  <div className="p-2.5 bg-[#0F131C] rounded-[4px] border border-[#1F2937] flex justify-between items-center text-xs">
                    <span className="font-display font-bold">Eliminator: RCB vs KKR</span>
                    <span className="font-mono text-[#F59E0B]">Oct 25</span>
                  </div>
                  <div className="p-2.5 bg-[#0F131C] rounded-[4px] border border-[#1F2937] flex justify-between items-center text-xs">
                    <span className="font-display font-bold">Qualifier 2: Winner Eliminator vs Q1 Runner</span>
                    <span className="font-mono text-[#F59E0B]">Oct 27</span>
                  </div>
                  <div className="p-2.5 bg-[#0F131C] rounded-[4px] border border-[#10B981]/50 flex justify-between items-center text-xs font-bold text-[#10B981]">
                    <span>Grand Finale: IPL Mega Championship 2026</span>
                    <span className="font-mono">Oct 29</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PLAY (Arena Launchpad)                                             */}
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
                <b className="font-bold text-sm font-display text-[#DFE2EF] block">Host Tournament Room</b>
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
                <b className="font-bold text-sm font-display text-[#DFE2EF] block">Join With Invite Code</b>
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
                <b className="font-bold text-sm font-display text-[#DFE2EF] block">Solo vs AI Bidding Bots</b>
                <small className="text-xs text-[#86948A] block mt-0.5">Practice strategy against Easy, Medium, or Hard bots.</small>
              </div>
              <span className="ml-auto text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-[2px]">
                SOLO
              </span>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: FRIENDS (Renamed from Teams: Community Rosters & Franchises)       */}
        {/* ========================================================================= */}
        {activeTab === 'friends' && (
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
              <h2 className="font-display font-extrabold text-lg text-[#DFE2EF]">
                {activeRoster.name}
              </h2>
              <p className="text-[11px] text-[#86948A] font-mono font-bold">
                Franchise Squad Roster · IPL 2026 Circuit
              </p>
            </div>

            {/* Subtabs: OVERVIEW / RESULTS / MATCHES */}
            <div className="flex border-b border-[#1F2937] pb-1 gap-6 text-xs font-bold font-display uppercase tracking-wider">
              <button 
                onClick={() => setFriendsSubtab('overview')}
                className={`pb-2 transition ${friendsSubtab === 'overview' ? 'text-[#DFE2EF] border-b-2 border-[#10B981]' : 'text-[#86948A] hover:text-[#DFE2EF]'}`}
              >
                OVERVIEW
              </button>
              <button 
                onClick={() => setFriendsSubtab('results')}
                className={`pb-2 transition ${friendsSubtab === 'results' ? 'text-[#DFE2EF] border-b-2 border-[#10B981]' : 'text-[#86948A] hover:text-[#DFE2EF]'}`}
              >
                RESULTS
              </button>
              <button 
                onClick={() => setFriendsSubtab('matches')}
                className={`pb-2 transition ${friendsSubtab === 'matches' ? 'text-[#DFE2EF] border-b-2 border-[#10B981]' : 'text-[#86948A] hover:text-[#DFE2EF]'}`}
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
                  className={`px-3 py-1.5 rounded-[4px] text-xs font-extrabold font-display transition flex-shrink-0 ${
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
                      <span className="font-display font-bold text-sm text-[#DFE2EF] truncate">
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
        {/* TAB 5: PROFILE (Inspected Player & User Profile)                          */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-fade-up">
            
            {/* Studio Portrait Hero with Floating Team Badge */}
            <div className="relative rounded-[8px] bg-[#111827] border border-[#1F2937] p-4 overflow-hidden shadow-xl">
              <div className="flex gap-4 items-center">
                <div className="w-20 h-20 rounded-[6px] bg-[#0F131C] border border-[#1F2937] overflow-hidden shadow-md flex-shrink-0">
                  <img 
                    src={inspectedPlayer.img} 
                    alt={inspectedPlayer.name} 
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{inspectedPlayer.flag}</span>
                    <span className="text-xs font-mono font-bold text-[#10B981]">
                      {inspectedPlayer.teamCode}
                    </span>
                  </div>
                  <h3 className="font-display font-black text-lg text-white truncate">
                    {inspectedPlayer.name}
                  </h3>
                  <p className="text-xs text-[#86948A] truncate">
                    {inspectedPlayer.role}
                  </p>
                </div>
              </div>
            </div>

            {/* Subtabs: OVERVIEW / STATS / CAREER */}
            <div className="flex border-b border-[#1F2937] pb-1 gap-6 text-xs font-bold font-display uppercase tracking-wider">
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

            {/* Detail Rows */}
            <div className="p-4 bg-[#111827] border border-[#1F2937] rounded-[6px] divide-y divide-[#1F2937] text-xs">
              <div className="flex justify-between py-2.5">
                <span className="text-[#86948A]">Full Name</span>
                <b className="text-[#DFE2EF] font-display">{inspectedPlayer.name}</b>
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
                <span className="text-[#86948A]">T20 Strike Rate</span>
                <b className="text-[#DFE2EF] font-mono">{inspectedPlayer.strikeRate}</b>
              </div>
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
      {/* 2. FIXED BOTTOM COMMAND DOCK (Exact Order: Home | Matches | Play | Friends | Profile) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-3 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
        <nav className="pointer-events-auto h-14 bg-[#1C1F29]/95 backdrop-blur-xl border border-[#262A34] rounded-[10px] px-2 flex items-center shadow-[0_12px_28px_-6px_rgba(0,0,0,0.7)] max-w-md w-full justify-between sm:justify-around">
          
          {/* 1. Home */}
          <button
            onClick={() => { setActiveTab('home'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-[4px] transition cursor-pointer ${
              activeTab === 'home' 
                ? 'bg-[#10B981] text-[#090D16] font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]' 
                : 'text-[#86948A] hover:text-[#DFE2EF]'
            }`}
            title="Home"
          >
            <HomeIcon size={16} />
            <span className="text-[10px] font-display font-bold uppercase tracking-wider mt-0.5">Home</span>
          </button>

          {/* 2. Matches */}
          <button
            onClick={() => { setActiveTab('matches'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-[4px] transition cursor-pointer ${
              activeTab === 'matches' 
                ? 'bg-[#10B981] text-[#090D16] font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]' 
                : 'text-[#86948A] hover:text-[#DFE2EF]'
            }`}
            title="Matches"
          >
            <Layers size={16} />
            <span className="text-[10px] font-display font-bold uppercase tracking-wider mt-0.5">Matches</span>
          </button>

          {/* 3. Play */}
          <button
            onClick={() => { setActiveTab('play'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-[4px] transition cursor-pointer ${
              activeTab === 'play' 
                ? 'bg-[#10B981] text-[#090D16] font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]' 
                : 'text-[#86948A] hover:text-[#DFE2EF]'
            }`}
            title="Play"
          >
            <Play size={16} className={activeTab === 'play' ? 'fill-[#090D16]' : 'fill-none'} />
            <span className="text-[10px] font-display font-bold uppercase tracking-wider mt-0.5">Play</span>
          </button>

          {/* 4. Friends */}
          <button
            onClick={() => { setActiveTab('friends'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-[4px] transition cursor-pointer ${
              activeTab === 'friends' 
                ? 'bg-[#10B981] text-[#090D16] font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]' 
                : 'text-[#86948A] hover:text-[#DFE2EF]'
            }`}
            title="Friends"
          >
            <Users size={16} />
            <span className="text-[10px] font-display font-bold uppercase tracking-wider mt-0.5">Friends</span>
          </button>

          {/* 5. Profile */}
          <button
            onClick={() => { setActiveTab('profile'); window.scrollTo(0, 0); }}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-[4px] transition cursor-pointer ${
              activeTab === 'profile' 
                ? 'bg-[#10B981] text-[#090D16] font-bold shadow-[0_0_15px_rgba(16,185,129,0.35)]' 
                : 'text-[#86948A] hover:text-[#DFE2EF]'
            }`}
            title="Profile"
          >
            <User size={16} />
            <span className="text-[10px] font-display font-bold uppercase tracking-wider mt-0.5">Profile</span>
          </button>

        </nav>
      </div>

    </div>
  );
}
