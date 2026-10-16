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
  Trophy,
  Heart,
  UserPlus,
  Check,
  X,
  Trash2,
  Send,
  Lock,
  Plus,
  Sparkles,
  Copy,
  Award
} from 'lucide-react';
import { ServerHealthBadge } from '../components/ServerHealthBadge';

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
  const [matchesFilter, setMatchesFilter] = useState<'public' | 'private'>('public');
  const [privateRooms, setPrivateRooms] = useState<any[]>([]);
  const [privateRoomsLoading, setPrivateRoomsLoading] = useState(false);
  const [privateRoomCodeInput, setPrivateRoomCodeInput] = useState('');
  const [privateRoomPasswordInput, setPrivateRoomPasswordInput] = useState('');

  // Social / Friends state
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [friendsSearchQuery, setFriendsSearchQuery] = useState('');
  const [friendsSearchResults, setFriendsSearchResults] = useState<any[]>([]);
  const [friendsSearchLoading, setFriendsSearchLoading] = useState(false);
  const [socialNotice, setSocialNotice] = useState('');

  // Real Authenticated User Profile state
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [likeInProgress, setLikeInProgress] = useState(false);

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
    socket.on('friend_request_received', () => {
      fetchFriends();
    });
    socket.on('friend_request_accepted', () => {
      fetchFriends();
    });
    socket.on('room_invitation_received', (data: any) => {
      const accept = window.confirm(`🎮 ${data.senderDisplayName} invited you to join ${data.roomName} (#${data.roomCode})! Join now?`);
      if (accept) {
        navigate(`/room/${data.roomCode}`);
      }
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

  const fetchPrivateRooms = async () => {
    const token = localStorage.getItem('ca26_token');
    if (!token) return;
    setPrivateRoomsLoading(true);
    try {
      const data = await safeFetch<any[]>('/api/rooms/my/private');
      setPrivateRooms(Array.isArray(data) ? data : []);
    } catch {
      // Retain existing state
    } finally {
      setPrivateRoomsLoading(false);
    }
  };

  const fetchFriends = async () => {
    const token = localStorage.getItem('ca26_token');
    if (!token) return;
    setFriendsLoading(true);
    try {
      const [friends, reqs] = await Promise.all([
        safeFetch<any[]>('/api/friends'),
        safeFetch<{ incoming: any[]; outgoing: any[] }>('/api/friends/requests')
      ]);
      setFriendsList(Array.isArray(friends) ? friends : []);
      setIncomingRequests(Array.isArray(reqs?.incoming) ? reqs.incoming : []);
    } catch {
      // Retain existing state
    } finally {
      setFriendsLoading(false);
    }
  };

  const searchFriends = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!friendsSearchQuery.trim() || friendsSearchQuery.trim().length < 2) return;
    setFriendsSearchLoading(true);
    try {
      const results = await safeFetch<any[]>(`/api/friends/search?q=${encodeURIComponent(friendsSearchQuery.trim())}`);
      setFriendsSearchResults(Array.isArray(results) ? results : []);
    } catch (err: any) {
      setSocialNotice(err.message || 'Search failed');
    } finally {
      setFriendsSearchLoading(false);
    }
  };

  const handleSendFriendRequest = async (targetId: string) => {
    try {
      await safeFetch('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ targetId })
      });
      setSocialNotice('Friend request sent!');
      setTimeout(() => setSocialNotice(''), 3000);
      searchFriends();
    } catch (err: any) {
      setSocialNotice(err.message || 'Could not send request');
      setTimeout(() => setSocialNotice(''), 3000);
    }
  };

  const handleRespondFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      await safeFetch('/api/friends/respond', {
        method: 'POST',
        body: JSON.stringify({ requestId, action })
      });
      fetchFriends();
      setSocialNotice(action === 'accept' ? 'Friend request accepted!' : 'Request declined');
      setTimeout(() => setSocialNotice(''), 3000);
    } catch (err: any) {
      setSocialNotice(err.message || 'Action failed');
      setTimeout(() => setSocialNotice(''), 3000);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await safeFetch(`/api/friends/${friendId}`, { method: 'DELETE' });
      fetchFriends();
    } catch {}
  };

  const handleInviteToRoom = async (friendId: string) => {
    const code = prompt('Enter 6-character Room Code to invite friend to:');
    if (!code) return;
    try {
      await safeFetch('/api/friends/invite', {
        method: 'POST',
        body: JSON.stringify({ roomCode: code.trim().toUpperCase(), friendId })
      });
      alert('Invitation sent to player!');
    } catch (err: any) {
      alert(err.message || 'Failed to send invite');
    }
  };

  const fetchUserProfile = async () => {
    if (!user?.id) return;
    setProfileLoading(true);
    try {
      const data = await safeFetch<any>(`/api/users/${user.id}/profile`);
      if (data && !data.error) {
        setProfileData(data);
      }
    } catch {
      // Retain existing state
    } finally {
      setProfileLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!user?.id || likeInProgress) return;
    setLikeInProgress(true);
    try {
      const res = await safeFetch<{ success: boolean; liked: boolean; likes_count: number }>(`/api/users/${user.id}/like`, {
        method: 'POST'
      });
      if (res && res.success) {
        setProfileData((prev: any) => ({
          ...prev,
          likes_count: res.likes_count,
          has_liked: res.liked
        }));
      }
    } catch {
    } finally {
      setLikeInProgress(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'friends') {
      fetchFriends();
    } else if (activeTab === 'profile') {
      fetchUserProfile();
    } else if (activeTab === 'matches' && matchesFilter === 'private') {
      fetchPrivateRooms();
    }
  }, [activeTab, matchesFilter, user?.id]);

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

  // FILTER RULES: Public & Currently Live Rooms (including paused)
  const publicLiveRooms = publicRooms.filter(r => {
    const isPublic = !r.is_private || r.is_private === 0;
    const isLive = ['IN_PROGRESS', 'LIVE', 'FINAL_ROUND', 'PAUSED'].includes(r.status);
    return isPublic && isLive;
  });

  // FILTER RULES: Public Waiting Rooms (Lobby stage)
  const publicWaitingRooms = publicRooms.filter(r => {
    const isPublic = !r.is_private || r.is_private === 0;
    return isPublic && r.status === 'LOBBY';
  });

  // Active Public Rooms (Lobby + Live + Paused)
  const activePublicRooms = publicRooms.filter(r => {
    const isPublic = !r.is_private || r.is_private === 0;
    return isPublic && ['LOBBY', 'IN_PROGRESS', 'LIVE', 'FINAL_ROUND', 'PAUSED'].includes(r.status);
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
              IPL 2026 MULTIPLAYER GAME
            </p>

            <button
              onClick={handleStartFromSplash}
              className="w-full py-3 bg-[#10B981] hover:bg-[#059669] text-[#090D16] rounded-[6px] font-display font-extrabold text-sm uppercase tracking-wider transition-all shadow-[0_0_24px_rgba(16,185,129,0.4)] cursor-pointer active:scale-95"
            >
              START GAME
            </button>
          </div>
        </div>
      )}

      {/* Main Container - Mobile First App Shell */}
      <div className="max-w-md md:max-w-lg mx-auto min-h-screen relative flex flex-col pb-24 px-4 pt-3">
        
        {/* ========================================================================= */}
        {/* TOP HEADER: Logo text & status                                            */}
        {/* ========================================================================= */}
        <header className="flex justify-between items-center h-12 mb-3 pb-2 border-b border-[#1F2937]">
          <div 
            onClick={() => { setActiveTab('home'); window.scrollTo(0, 0); }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div>
              <span className="font-display font-extrabold text-base sm:text-lg tracking-tight leading-none block text-[#DFE2EF]">
                Cricket Auction
              </span>
              <span className="text-[10px] font-bold font-mono tracking-wider text-[#10B981] uppercase block mt-0.5">
                {activeTab === 'home' ? 'Live Match' : 
                 activeTab === 'matches' ? 'Matches' :
                 activeTab === 'play' ? 'Play' :
                 activeTab === 'friends' ? 'Friends' : 'Profile'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ServerHealthBadge compact />
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
                  {/* Left: Indicator + Live/Paused label + Room Name */}
                  <div>
                    {featuredRoom.status === 'PAUSED' ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F59E0B]/15 border border-[#F59E0B]/40 text-[#F59E0B] text-[11px] font-mono font-bold tracking-wider shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-[#F59E0B] inline-block"></span>
                        <span>Paused</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/40 text-[#EF4444] text-[11px] font-mono font-bold tracking-wider shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping inline-block"></span>
                        <span>Live</span>
                      </div>
                    )}
                    <div className="text-xs font-mono font-bold text-[#86948A] mt-1.5 tracking-tight">
                      Room : <span className="text-[#DFE2EF] font-sans font-bold">{featuredRoom.room_name}</span> (#{featuredRoom.room_code})
                    </div>
                  </div>

                  {/* Right: Watch/Join Button + Team Availability */}
                  <div className="flex flex-col items-end gap-1">
                    {(featuredRoom.teams_count || 0) < (featuredRoom.max_teams || 10) ? (
                      <button
                        onClick={() => navigate(`/room/${featuredRoom.room_code}`)}
                        className="px-3.5 py-1 rounded-[4px] bg-[#10B981] hover:bg-[#059669] text-[#090D16] font-display font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-sm cursor-pointer"
                        title="Join Live Match"
                      >
                        Join
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/room/${featuredRoom.room_code}/auction?spectate=true`, { state: { spectator: true } })}
                        className="px-3.5 py-1 rounded-[4px] bg-[#0F131C] border border-[#10B981] hover:bg-[#10B981] text-[#10B981] hover:text-[#090D16] font-display font-black text-xs uppercase tracking-wider transition active:scale-95 shadow-sm cursor-pointer"
                        title="Watch Live Match"
                      >
                        Watch
                      </button>
                    )}
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
                      {leadingTeam.franchise_id} — {leadingTeam.points || 0} Rating Pts
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
                      {runnerUpTeam.franchise_id} — {runnerUpTeam.points || 0} Rating Pts
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
                  Ready to Start a Game
                </h3>
                <p className="text-xs text-[#86948A] mt-1 max-w-xs mx-auto">
                  Public auction rooms will appear here when a game begins.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <GameButton
                    onClick={() => navigate('/create')}
                    variant="primary"
                    size="sm"
                  >
                    HOST GAME
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

            {/* B. LIVE MATCH ROOM LIST */}
            <div className="space-y-2.5 pt-1">
              
              <div className="flex justify-between items-center px-1">
                <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-[#86948A]">
                  LIVE MATCHES ({publicLiveRooms.length})
                </h3>
                <span className="font-display font-bold text-xs text-[#86948A]">
                  Team Available
                </span>
              </div>

              {roomsLoading && publicLiveRooms.length === 0 ? (
                <div className="p-8 text-center bg-[#111827] border border-[#1F2937] rounded-[6px]">
                  <RefreshCw size={20} className="animate-spin text-[#10B981] mx-auto mb-2" />
                  <span className="text-xs text-[#86948A] font-mono">Syncing active rooms...</span>
                </div>
              ) : publicLiveRooms.length === 0 ? (
                <div className="p-6 text-center bg-[#111827] border border-[#1F2937] rounded-[6px]">
                  <p className="text-xs text-[#86948A] font-mono">
                    No active live matches in progress right now.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {publicLiveRooms.map((room, idx) => {
                    const hostUser = room.host_user;
                    const hostAvatar = hostUser?.avatar_emoji;
                    const rawPurse = room.host_purse_lakhs || room.starting_purse_lakhs || 12000;
                    const purseText = `${(rawPurse / 100).toFixed(0)}cr`;
                    const hasOpenSlot = (room.teams_count || 0) < (room.max_teams || 10);
                    const isPaused = room.status === 'PAUSED';

                    return (
                      <div
                        key={room.id || room.room_code || idx}
                        className="p-3 bg-[#111827] border border-[#1F2937] hover:border-[#10B981]/50 rounded-[6px] flex items-center justify-between gap-3 transition shadow-sm"
                      >
                        {/* Left: Serial Number, Profile Icon, Room Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs font-bold text-[#86948A] w-5 text-center flex-shrink-0">
                            {idx + 1}
                          </span>

                          <div className="w-10 h-10 rounded-[4px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-center flex-shrink-0 text-lg shadow-inner">
                            {hostAvatar ? (
                              <span>{hostAvatar}</span>
                            ) : (
                              <User size={18} className="text-[#86948A]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-display font-bold text-white truncate">
                                {room.room_name}
                              </span>
                              {isPaused ? (
                                <span className="px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] text-[10px] font-mono font-bold">PAUSED</span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] text-[10px] font-mono font-bold">LIVE</span>
                              )}
                            </div>
                            <div className="text-[11px] font-mono text-[#86948A] mt-0.5">
                              #{room.room_code} · Purse: <span className="text-[#10B981] font-bold">{purseText}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Watch/Join Button and Team Availability */}
                        <div className="flex items-center gap-2.5 flex-shrink-0">
                          {hasOpenSlot ? (
                            <button
                              onClick={() => navigate(`/room/${room.room_code}`)}
                              className="px-3 py-1 rounded-[4px] bg-[#10B981] hover:bg-[#059669] text-[#090D16] font-display font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
                              title="Join Room"
                            >
                              Join
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/room/${room.room_code}/auction?spectate=true`, { state: { spectator: true } })}
                              className="px-3 py-1 rounded-[4px] bg-[#0F131C] border border-[#10B981] hover:bg-[#10B981] text-[#10B981] hover:text-[#090D16] font-display font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
                              title="Watch Auction"
                            >
                              Watch
                            </button>
                          )}

                          <span className="text-xs font-mono font-bold text-[#DFE2EF] min-w-[65px] text-right">
                            {room.teams_count || room.participants?.length || 0}/{room.max_teams || 10}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* C. WAITING FOR PLAYERS SECTION */}
            <div className="space-y-2.5 pt-2">
              <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-[#86948A]">
                    WAITING FOR PLAYERS
                  </h3>
                  <span className="px-1.5 py-0.5 rounded-[4px] bg-[#10B981]/15 text-[#10B981] text-[10px] font-mono font-bold">
                    {publicWaitingRooms.length} Open
                  </span>
                </div>
                <button
                  onClick={() => navigate('/create')}
                  className="text-xs font-display font-bold text-[#10B981] hover:text-[#6FFBBE] transition cursor-pointer"
                >
                  ＋ Create Room
                </button>
              </div>

              {publicWaitingRooms.length === 0 ? (
                <div className="p-5 text-center bg-[#111827] border border-[#1F2937] rounded-[6px]">
                  <p className="text-xs text-[#86948A] font-mono mb-2">No public rooms currently waiting for players.</p>
                  <button
                    onClick={() => navigate('/create')}
                    className="px-3.5 py-1.5 rounded-[4px] bg-[#10B981] text-[#090D16] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#6FFBBE] transition shadow cursor-pointer"
                  >
                    Host a Room Now
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {publicWaitingRooms.map((room) => {
                    const hostUser = room.host_user;
                    const hostName = hostUser?.display_name || room.host_id || 'Host';
                    const filledSlots = room.teams_count || 0;
                    const maxSlots = room.max_teams || 10;
                    const isFull = filledSlots >= maxSlots;

                    return (
                      <div
                        key={room.room_code}
                        className="p-3 bg-[#111827] border border-[#1F2937] hover:border-[#10B981]/50 rounded-[6px] flex items-center justify-between gap-3 transition shadow-sm"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-display font-bold text-white truncate">
                              {room.room_name}
                            </span>
                            <span className="font-mono text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded border border-[#10B981]/30">
                              #{room.room_code}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono text-[#86948A] mt-1">
                            Host: <span className="text-[#DFE2EF] font-bold">{hostName}</span> · Slots: <span className="text-white font-bold">{filledSlots}/{maxSlots} Filled</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => navigate(`/room/${room.room_code}`)}
                            disabled={isFull}
                            className={`px-3.5 py-1.5 rounded-[4px] font-display font-bold text-xs uppercase tracking-wider transition ${
                              isFull
                                ? 'bg-[#1F2937] text-[#86948A] cursor-not-allowed'
                                : 'bg-[#10B981] hover:bg-[#059669] text-[#090D16] shadow active:scale-95 cursor-pointer'
                            }`}
                          >
                            {isFull ? 'Full' : 'Join Room'}
                          </button>
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
        {/* ========================================================================= */}
        {/* TAB 2: MATCHES (Public Room & Private Room)                               */}
        {/* ========================================================================= */}
        {activeTab === 'matches' && (
          <div className="space-y-4 animate-fade-up">
            
            {/* Filter Pills: Public Room & Private Room */}
            <div className="flex gap-2 mb-1 overflow-x-auto items-center">
              <button
                onClick={() => setMatchesFilter('public')}
                className={`px-3.5 py-1.5 rounded-[4px] text-xs font-bold font-display transition whitespace-nowrap cursor-pointer ${
                  matchesFilter === 'public' 
                    ? 'bg-[#10B981] text-[#090D16] shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                    : 'bg-[#111827] text-[#86948A] border border-[#1F2937] hover:text-[#DFE2EF]'
                }`}
              >
                Public Room ({activePublicRooms.length})
              </button>
              <button
                onClick={() => { setMatchesFilter('private'); fetchPrivateRooms(); }}
                className={`px-3.5 py-1.5 rounded-[4px] text-xs font-bold font-display transition whitespace-nowrap cursor-pointer ${
                  matchesFilter === 'private' 
                    ? 'bg-[#10B981] text-[#090D16] shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                    : 'bg-[#111827] text-[#86948A] border border-[#1F2937] hover:text-[#DFE2EF]'
                }`}
              >
                Private Room ({privateRooms.length})
              </button>
              <button 
                onClick={() => navigate('/create')} 
                className="ml-auto text-xs bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 px-3 py-1.5 rounded-[4px] font-bold font-display hover:bg-[#10B981]/25 transition whitespace-nowrap cursor-pointer"
              >
                ＋ Create Room
              </button>
            </div>

            {/* TAB: PUBLIC ROOMS */}
            {matchesFilter === 'public' && (
              <div className="space-y-2.5">
                {roomsLoading && activePublicRooms.length === 0 ? (
                  <div className="p-8 text-center bg-[#111827] border border-[#1F2937] rounded-[6px]">
                    <RefreshCw size={20} className="animate-spin text-[#10B981] mx-auto mb-2" />
                    <span className="text-xs text-[#86948A] font-mono">Syncing public rooms...</span>
                  </div>
                ) : activePublicRooms.length === 0 ? (
                  <div className="p-6 text-center bg-[#111827] border border-[#1F2937] rounded-[6px]">
                    <p className="text-xs text-[#86948A] mb-3 font-mono">No public rooms active right now.</p>
                    <GameButton
                      onClick={() => navigate('/create')}
                      variant="primary"
                      size="sm"
                    >
                      CREATE ROOM
                    </GameButton>
                  </div>
                ) : (
                  activePublicRooms.map((r: any) => {
                    const isLive = ['IN_PROGRESS', 'LIVE', 'FINAL_ROUND'].includes(r.status);
                    const isPaused = r.status === 'PAUSED';
                    const isWaiting = r.status === 'LOBBY';
                    const filledSlots = r.teams_count || 0;
                    const maxSlots = r.max_teams || 10;
                    const hasOpenSlot = filledSlots < maxSlots;

                    return (
                      <div 
                        key={r.room_code}
                        className="p-3.5 bg-[#111827] border border-[#1F2937] rounded-[6px] hover:border-[#10B981]/40 transition flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-[#10B981] text-xs">#{r.room_code}</span>
                            {isLive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EF4444]/20 text-[#EF4444] font-mono font-bold">● LIVE</span>}
                            {isPaused && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] font-mono font-bold">PAUSED</span>}
                            {isWaiting && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#06B6D4]/20 text-[#06B6D4] font-mono font-bold">WAITING</span>}
                          </div>
                          <h4 className="font-display font-bold text-sm text-[#DFE2EF] truncate">{r.room_name}</h4>
                          <span className="text-[11px] text-[#86948A] font-mono block mt-0.5">
                            Slots: <b className="text-white">{filledSlots}/{maxSlots}</b> · Purse: <b className="text-[#10B981]">{formatCr(r.starting_purse_lakhs || 12000)}</b>
                          </span>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 items-center">
                          {hasOpenSlot ? (
                            <button
                              onClick={() => navigate(`/room/${r.room_code}`)}
                              className="px-3.5 py-1.5 rounded-[4px] bg-[#10B981] hover:bg-[#059669] text-[#090D16] font-display font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer shadow"
                            >
                              Join Room
                            </button>
                          ) : (
                            <button
                              onClick={() => navigate(`/room/${r.room_code}/auction?spectate=true`, { state: { spectator: true } })}
                              className="px-3.5 py-1.5 rounded-[4px] bg-[#0F131C] border border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-[#090D16] font-display font-bold text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
                            >
                              Watch
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB: PRIVATE ROOMS */}
            {matchesFilter === 'private' && (
              <div className="space-y-3">
                {/* Direct Room Code & Password Entry Box */}
                <div className="p-4 bg-[#111827] border border-[#1F2937] rounded-[6px] space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock size={15} className="text-[#10B981]" />
                    <span className="text-xs font-display font-bold uppercase tracking-wider text-white">Join Private Room</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Room Code (e.g. 6 CHARS)"
                      value={privateRoomCodeInput}
                      onChange={(e) => setPrivateRoomCodeInput(e.target.value.toUpperCase())}
                      className="px-3 py-2 bg-[#0B1120] border border-[#1F2937] rounded-[4px] text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-[#10B981]"
                    />
                    <input
                      type="password"
                      placeholder="Room Password (if set)"
                      value={privateRoomPasswordInput}
                      onChange={(e) => setPrivateRoomPasswordInput(e.target.value)}
                      className="px-3 py-2 bg-[#0B1120] border border-[#1F2937] rounded-[4px] text-xs text-white focus:outline-none focus:border-[#10B981]"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (!privateRoomCodeInput.trim()) return alert('Please enter room code');
                      navigate(`/room/${privateRoomCodeInput.trim()}`, {
                        state: { password: privateRoomPasswordInput }
                      });
                    }}
                    className="w-full py-2 bg-[#10B981] hover:bg-[#059669] text-[#090D16] rounded-[4px] font-display font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Enter Private Room
                  </button>
                </div>

                {/* Authenticated user's private rooms list */}
                {!user ? (
                  <div className="p-5 text-center bg-[#111827] border border-[#1F2937] rounded-[6px] space-y-2">
                    <p className="text-xs text-[#86948A] font-mono">Sign in to view your private rooms and invitations.</p>
                    <button
                      onClick={() => navigate('/login')}
                      className="px-4 py-1.5 rounded-[4px] bg-[#10B981] text-[#090D16] font-display font-bold text-xs uppercase cursor-pointer"
                    >
                      Sign In
                    </button>
                  </div>
                ) : privateRoomsLoading ? (
                  <div className="p-6 text-center bg-[#111827] border border-[#1F2937] rounded-[6px]">
                    <RefreshCw size={20} className="animate-spin text-[#10B981] mx-auto mb-2" />
                    <span className="text-xs text-[#86948A] font-mono">Loading private rooms...</span>
                  </div>
                ) : privateRooms.length === 0 ? (
                  <div className="p-6 text-center bg-[#111827] border border-[#1F2937] rounded-[6px]">
                    <p className="text-xs text-[#86948A] mb-2 font-mono">No private rooms found for your account.</p>
                    <small className="text-[11px] text-[#6B7280] block mb-3">Host a private room with a password or accept an invitation from a friend.</small>
                    <button
                      onClick={() => navigate('/create')}
                      className="px-3.5 py-1.5 rounded-[4px] bg-[#10B981] text-[#090D16] font-display font-bold text-xs uppercase cursor-pointer"
                    >
                      Host Private Room
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {privateRooms.map((r: any) => (
                      <div 
                        key={r.room_code}
                        className="p-3.5 bg-[#111827] border border-[#1F2937] rounded-[6px] hover:border-[#10B981]/40 transition flex items-center justify-between gap-3 shadow-sm"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-[#10B981] text-xs">#{r.room_code}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">PRIVATE</span>
                            <span className="text-[10px] font-mono text-[#86948A]">● {r.status}</span>
                          </div>
                          <h4 className="font-display font-bold text-sm text-[#DFE2EF]">{r.room_name}</h4>
                          <span className="text-[11px] text-[#86948A] font-mono">Slots: {r.teams_count || 0}/{r.max_teams || 10} Filled</span>
                        </div>
                        <button
                          onClick={() => navigate(`/room/${r.room_code}`)}
                          className="px-3 py-1.5 rounded-[4px] bg-[#10B981] hover:bg-[#059669] text-[#090D16] font-display font-bold text-xs uppercase cursor-pointer"
                        >
                          Join Room
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                <b className="font-bold text-sm font-display text-[#DFE2EF] block">Host Room</b>
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
                <small className="text-xs text-[#86948A] block mt-0.5">Enter a 6-character room code to join a game.</small>
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
        {/* TAB 4: FRIENDS (Real Interactive Social System)                          */}
        {/* ========================================================================= */}
        {activeTab === 'friends' && (
          <div className="space-y-4 animate-fade-up">
            
            {/* Social Notification Banner */}
            {socialNotice && (
              <div className="p-2.5 rounded-[4px] bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] text-xs font-mono font-bold text-center animate-fade-in">
                {socialNotice}
              </div>
            )}

            {!user ? (
              <div className="p-8 text-center bg-[#111827] border border-[#1F2937] rounded-[8px] space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
                  <Users size={32} />
                </div>
                <h3 className="font-display font-extrabold text-base text-white">Friends</h3>
                <p className="text-xs text-[#86948A] max-w-xs mx-auto font-mono">
                  Sign in or create an account to add friends with their Player Tag, see online status, and send game invites.
                </p>
                <GameButton
                  onClick={() => navigate('/login')}
                  variant="primary"
                  size="md"
                  fullWidth
                  icon={<LogIn size={16} />}
                >
                  SIGN IN / REGISTER
                </GameButton>
              </div>
            ) : (
              <>
                {/* Header & Search Bar */}
                <div className="p-4 bg-[#111827] border border-[#1F2937] rounded-[8px] space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-display font-extrabold text-base text-white">Friends ({friendsList.length})</h2>
                      <p className="text-[11px] text-[#86948A] font-mono">
                        {friendsList.filter(f => f.is_online).length} Online now · Search by Player Tag
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-[4px] bg-[#0F131C] border border-[#1F2937] text-[10px] font-mono text-[#10B981] font-bold">
                      Tag: {user.username}
                    </span>
                  </div>

                  <form onSubmit={searchFriends} className="flex gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3 top-3 text-[#86948A]" />
                      <input
                        type="text"
                        placeholder="Player Tag or Name..."
                        value={friendsSearchQuery}
                        onChange={(e) => setFriendsSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-[#0B1120] border border-[#1F2937] rounded-[4px] text-xs text-white focus:outline-none focus:border-[#10B981]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={friendsSearchLoading}
                      className="px-3.5 py-2 bg-[#10B981] hover:bg-[#059669] text-[#090D16] rounded-[4px] font-display font-bold text-xs uppercase cursor-pointer transition disabled:opacity-50"
                    >
                      {friendsSearchLoading ? <RefreshCw size={14} className="animate-spin" /> : 'Search'}
                    </button>
                  </form>

                  {/* Search Results */}
                  {friendsSearchResults.length > 0 && (
                    <div className="pt-2 border-t border-[#1F2937] space-y-2">
                      <span className="text-[10px] font-mono font-bold text-[#86948A] uppercase">Search Results</span>
                      {friendsSearchResults.map((sr) => (
                        <div key={sr.id} className="p-2.5 bg-[#0F131C] border border-[#1F2937] rounded-[4px] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-lg">{sr.avatar_emoji || '🏏'}</span>
                            <div className="min-w-0">
                              <span className="text-xs font-display font-bold text-white block truncate">{sr.display_name}</span>
                              <span className="text-[10px] font-mono text-[#86948A]">@{sr.username} · {sr.rank_name || 'Rookie'}</span>
                            </div>
                          </div>
                          <div>
                            {sr.relationship === 'friend' ? (
                              <span className="px-2 py-1 rounded bg-[#10B981]/20 text-[#10B981] text-[10px] font-mono font-bold">Friend ✓</span>
                            ) : sr.relationship === 'pending_sent' ? (
                              <span className="px-2 py-1 rounded bg-[#F59E0B]/20 text-[#F59E0B] text-[10px] font-mono font-bold">Request Sent</span>
                            ) : sr.relationship === 'pending_received' ? (
                              <span className="px-2 py-1 rounded bg-[#06B6D4]/20 text-[#06B6D4] text-[10px] font-mono font-bold">Check Requests</span>
                            ) : (
                              <button
                                onClick={() => handleSendFriendRequest(sr.id)}
                                className="px-2.5 py-1 rounded-[4px] bg-[#10B981] hover:bg-[#059669] text-[#090D16] font-display font-bold text-xs cursor-pointer transition"
                              >
                                + Add Friend
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pending Requests Section (if any) */}
                {incomingRequests.length > 0 && (
                  <div className="p-3.5 bg-[#111827] border border-[#F59E0B]/40 rounded-[8px] space-y-2.5 shadow-sm">
                    <span className="text-xs font-display font-bold text-[#F59E0B] uppercase tracking-wider block">
                      Incoming Friend Requests ({incomingRequests.length})
                    </span>
                    <div className="space-y-2">
                      {incomingRequests.map((req) => (
                        <div key={req.id} className="p-2.5 bg-[#0F131C] border border-[#1F2937] rounded-[4px] flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base">{req.sender_avatar || '🏏'}</span>
                            <div className="min-w-0">
                              <span className="text-xs font-display font-bold text-white block truncate">{req.sender_display_name}</span>
                              <span className="text-[10px] font-mono text-[#86948A]">@{req.sender_username}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleRespondFriendRequest(req.id, 'accept')}
                              className="px-2.5 py-1 rounded-[4px] bg-[#10B981] hover:bg-[#059669] text-[#090D16] font-display font-bold text-xs uppercase cursor-pointer"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRespondFriendRequest(req.id, 'reject')}
                              className="px-2 py-1 rounded-[4px] bg-[#1F2937] hover:bg-[#EF4444] text-[#86948A] hover:text-white font-display font-bold text-xs uppercase cursor-pointer"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Accepted Friends List */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-display font-bold uppercase tracking-wider text-[#86948A]">
                      Your Friends ({friendsList.length})
                    </span>
                    <button
                      onClick={fetchFriends}
                      className="text-xs font-mono text-[#10B981] hover:text-[#6FFBBE] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={12} className={friendsLoading ? 'animate-spin' : ''} /> Refresh
                    </button>
                  </div>

                  {friendsList.length === 0 ? (
                    <div className="p-6 text-center bg-[#111827] border border-[#1F2937] rounded-[8px]">
                      <Users size={24} className="text-[#86948A] mx-auto mb-2" />
                      <p className="text-xs text-[#86948A] font-mono mb-1">No friends added yet.</p>
                      <small className="text-[11px] text-[#6B7280] block">Search a player's Player Tag above to send a request.</small>
                    </div>
                  ) : (
                    friendsList.map((f) => (
                      <div
                        key={f.id}
                        className="p-3 bg-[#111827] border border-[#1F2937] hover:border-[#10B981]/40 rounded-[6px] flex items-center justify-between gap-3 transition shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar with Online indicator */}
                          <div className="relative">
                            <div className="w-10 h-10 rounded-[6px] bg-[#0F131C] border border-[#1F2937] flex items-center justify-center text-lg">
                              {f.avatar_emoji || '🏏'}
                            </div>
                            <span 
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#111827] ${
                                f.is_online ? 'bg-[#10B981]' : 'bg-[#4B5563]'
                              }`} 
                              title={f.is_online ? 'Online' : 'Offline'}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-display font-bold text-sm text-white truncate">{f.display_name}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#0F131C] text-[#10B981] border border-[#10B981]/30">
                                {f.rank_name || 'Rookie'}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-[#86948A] block mt-0.5 truncate">
                              @{f.username} · {f.auctions_won || 0}W / {f.auctions_played || 0}G · ❤️ {f.likes_count || 0}
                            </span>
                          </div>
                        </div>

                        {/* Friend Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleInviteToRoom(f.id)}
                            className="px-2.5 py-1.5 rounded-[4px] bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981] hover:text-[#090D16] font-display font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                            title="Invite to Room"
                          >
                            Invite
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Remove ${f.display_name} from friends?`)) {
                                handleRemoveFriend(f.id);
                              }
                            }}
                            className="p-1.5 rounded-[4px] text-[#86948A] hover:text-[#EF4444] transition cursor-pointer"
                            title="Remove Friend"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PROFILE (Real Player Profile & Career Record)                      */}
        {/* ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-fade-up">
            
            {!user ? (
              <div className="p-8 text-center bg-[#111827] border border-[#1F2937] rounded-[8px] space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center justify-center">
                  <User size={32} />
                </div>
                <h3 className="font-display font-extrabold text-base text-white">Player Profile</h3>
                <p className="text-xs text-[#86948A] max-w-xs mx-auto font-mono">
                  Sign in or register your account to view your career stats, ranks, champion trophies, and profile likes.
                </p>
                <GameButton
                  onClick={() => navigate('/login')}
                  variant="primary"
                  size="md"
                  fullWidth
                  icon={<LogIn size={16} />}
                >
                  SIGN IN / REGISTER PROFILE
                </GameButton>
              </div>
            ) : (
              <>
                {/* Profile Header Studio Card */}
                <div className="relative rounded-[8px] bg-[#111827] border border-[#1F2937] p-4 overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#10B981]/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="flex gap-4 items-center relative z-10">
                    {/* User Avatar */}
                    <div className="w-20 h-20 rounded-[8px] bg-[#0F131C] border-2 border-[#10B981] flex items-center justify-center text-4xl shadow-md flex-shrink-0">
                      <span>{profileData?.avatar_emoji || user.avatar_emoji || '🏏'}</span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-[4px] bg-[#10B981]/20 border border-[#10B981]/40 text-[#10B981] text-[10px] font-mono font-bold">
                          {profileData?.rank_name || user.rank_name || 'Rookie'} · LVL {profileData?.level || user.level || 1}
                        </span>
                      </div>

                      <h3 className="font-display font-black text-lg text-white truncate">
                        {profileData?.display_name || user.display_name}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-xs font-mono text-[#86948A] mt-0.5">
                        <span>@{profileData?.username || user.username}</span>
                        <span>·</span>
                        <span 
                          onClick={() => {
                            navigator.clipboard.writeText(user.id);
                            alert('Player ID copied to clipboard!');
                          }}
                          className="cursor-pointer hover:text-white flex items-center gap-1"
                          title="Click to copy ID"
                        >
                          ID: {(user.id || '').slice(0, 8).toUpperCase()} <Copy size={11} />
                        </span>
                      </div>
                    </div>

                    {/* Like Profile Button */}
                    <button
                      onClick={handleToggleLike}
                      disabled={likeInProgress}
                      className={`flex flex-col items-center justify-center p-2.5 rounded-[6px] border transition cursor-pointer active:scale-95 flex-shrink-0 ${
                        profileData?.has_liked
                          ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#EF4444]'
                          : 'bg-[#0F131C] border-[#1F2937] text-[#86948A] hover:text-[#EF4444] hover:border-[#EF4444]/50'
                      }`}
                      title="Like Profile"
                    >
                      <Heart size={18} className={profileData?.has_liked ? 'fill-[#EF4444]' : 'fill-none'} />
                      <span className="text-[10px] font-mono font-bold mt-1">
                        {profileData?.likes_count ?? user.likes_count ?? 0}
                      </span>
                    </button>
                  </div>

                  {/* XP Progress to next Rank */}
                  <div className="mt-4 pt-3 border-t border-[#1F2937]">
                    <div className="flex justify-between items-center text-[10px] font-mono text-[#86948A] mb-1">
                      <span>CAREER XP</span>
                      <span className="text-[#10B981] font-bold">{profileData?.xp || user.xp || 0} XP</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#0F131C] overflow-hidden">
                      <div 
                        className="h-full bg-[#10B981] transition-all duration-500 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(8, ((profileData?.xp || user.xp || 0) % 1500) / 15))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Career Stats Grid */}
                <div className="space-y-2">
                  <span className="text-xs font-display font-bold uppercase tracking-wider text-[#86948A] px-1 block">
                    Career Performance
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    <div className="p-3 bg-[#111827] border border-[#1F2937] rounded-[6px] text-center">
                      <span className="text-[10px] font-mono font-bold text-[#86948A] uppercase block">Games Played</span>
                      <span className="text-xl font-display font-black text-white mt-0.5 block">
                        {profileData?.auctions_played ?? user.auctions_played ?? 0}
                      </span>
                    </div>

                    <div className="p-3 bg-[#111827] border border-[#1F2937] rounded-[6px] text-center">
                      <span className="text-[10px] font-mono font-bold text-[#86948A] uppercase block">Wins (Champion)</span>
                      <span className="text-xl font-display font-black text-[#10B981] mt-0.5 block">
                        {profileData?.auctions_won ?? user.auctions_won ?? 0}
                      </span>
                    </div>

                    <div className="p-3 bg-[#111827] border border-[#1F2937] rounded-[6px] text-center">
                      <span className="text-[10px] font-mono font-bold text-[#86948A] uppercase block">Win Rate</span>
                      <span className="text-xl font-display font-black text-[#F59E0B] mt-0.5 block">
                        {profileData?.win_rate ?? 0}%
                      </span>
                    </div>

                    <div className="p-3 bg-[#111827] border border-[#1F2937] rounded-[6px] text-center">
                      <span className="text-[10px] font-mono font-bold text-[#86948A] uppercase block">Players Bought</span>
                      <span className="text-xl font-display font-black text-white mt-0.5 block">
                        {profileData?.total_players_bought ?? user.total_players_bought ?? 0}
                      </span>
                    </div>

                    <div className="p-3 bg-[#111827] border border-[#1F2937] rounded-[6px] text-center">
                      <span className="text-[10px] font-mono font-bold text-[#86948A] uppercase block">Blitz Games</span>
                      <span className="text-xl font-display font-black text-[#06B6D4] mt-0.5 block">
                        {profileData?.blitz_count ?? user.blitz_count ?? 0}
                      </span>
                    </div>

                    <div className="p-3 bg-[#111827] border border-[#1F2937] rounded-[6px] text-center">
                      <span className="text-[10px] font-mono font-bold text-[#86948A] uppercase block">Mega Games</span>
                      <span className="text-xl font-display font-black text-purple-400 mt-0.5 block">
                        {profileData?.mega_count ?? user.mega_count ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Controls */}
                <div className="pt-2">
                  <GameButton
                    onClick={handleSignOut}
                    variant="danger"
                    size="md"
                    fullWidth
                    icon={<LogOut size={16} />}
                  >
                    SIGN OUT ({user.username})
                  </GameButton>
                </div>
              </>
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
