import { IPLTeam } from '../types';

export const IPL_TEAMS: IPLTeam[] = [
  {
    id: 'csk',
    name: 'Chennai Super Kings',
    abbr: 'CSK',
    city: 'Chennai',
    color: '#F5A623',
    secondaryColor: '#004BA0',
  },
  {
    id: 'mi',
    name: 'Mumbai Indians',
    abbr: 'MI',
    city: 'Mumbai',
    color: '#004BA0',
    secondaryColor: '#D1AB3E',
  },
  {
    id: 'rcb',
    name: 'Royal Challengers Bangalore',
    abbr: 'RCB',
    city: 'Bangalore',
    color: '#EC1C24',
    secondaryColor: '#000000',
  },
  {
    id: 'kkr',
    name: 'Kolkata Knight Riders',
    abbr: 'KKR',
    city: 'Kolkata',
    color: '#3A225D',
    secondaryColor: '#B3A123',
  },
  {
    id: 'dc',
    name: 'Delhi Capitals',
    abbr: 'DC',
    city: 'Delhi',
    color: '#0078BC',
    secondaryColor: '#EF1C25',
  },
  {
    id: 'pbks',
    name: 'Punjab Kings',
    abbr: 'PBKS',
    city: 'Punjab',
    color: '#ED1B24',
    secondaryColor: '#A7A9AC',
  },
  {
    id: 'rr',
    name: 'Rajasthan Royals',
    abbr: 'RR',
    city: 'Rajasthan',
    color: '#EA1A85',
    secondaryColor: '#254AA5',
  },
  {
    id: 'srh',
    name: 'Sunrisers Hyderabad',
    abbr: 'SRH',
    city: 'Hyderabad',
    color: '#F26522',
    secondaryColor: '#000000',
  },
  {
    id: 'gt',
    name: 'Gujarat Titans',
    abbr: 'GT',
    city: 'Gujarat',
    color: '#1C2951',
    secondaryColor: '#C19A6B',
  },
  {
    id: 'lsg',
    name: 'Lucknow Super Giants',
    abbr: 'LSG',
    city: 'Lucknow',
    color: '#A72B4B',
    secondaryColor: '#00AEEF',
  },
];

export const ROLE_LABELS: Record<string, string> = {
  BAT: 'Batsman',
  BOWL: 'Bowler',
  AR: 'All-Rounder',
  WK: 'Wicket Keeper',
};

export const TIER_LABELS: Record<string, string> = {
  S: 'ICON',
  A: 'ELITE',
  B: 'PREMIUM',
  C: 'STANDARD',
  D: 'UNCAPPED',
};

export const PURSE_OPTIONS = [
  { label: '₹500 Lakhs', value: 500 },
  { label: '₹1000 Lakhs', value: 1000 },
  { label: '₹1500 Lakhs', value: 1500 },
];

export const TIMER_OPTIONS = [
  { label: '5 Seconds', value: 5 },
  { label: '10 Seconds', value: 10 },
  { label: '15 Seconds', value: 15 },
];

export const PLAYER_POOL_OPTIONS = [
  { label: '⚡ Quick (20 Players)', value: 'QUICK', count: 20 },
  { label: '🏏 Full (60 Players)', value: 'FULL', count: 60 },
  { label: '⚙️ Custom', value: 'CUSTOM', count: 0 },
];

export const SERVER_URL = (() => {
  const envUrl = (import.meta as any).env?.VITE_SERVER_URL;
  if (envUrl) return envUrl;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return `http://${host}:3001`;
    }
  }
  return 'http://localhost:3001';
})();

