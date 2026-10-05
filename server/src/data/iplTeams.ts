import { IPLTeam } from '../types';

/**
 * All 10 IPL teams with official colours and metadata.
 * Colours are approximate hex values of official branding.
 */
export const IPL_TEAMS: IPLTeam[] = [
  {
    id: 'csk',
    name: 'Chennai Super Kings',
    abbr: 'CSK',
    city: 'Chennai',
    color: '#F9CD05',       // gold/yellow
    secondaryColor: '#0081E9',
  },
  {
    id: 'dc',
    name: 'Delhi Capitals',
    abbr: 'DC',
    city: 'Delhi',
    color: '#0057A8',       // blue
    secondaryColor: '#EF1C25',
  },
  {
    id: 'gt',
    name: 'Gujarat Titans',
    abbr: 'GT',
    city: 'Ahmedabad',
    color: '#1C2B5E',       // navy blue
    secondaryColor: '#C8A84B',
  },
  {
    id: 'kkr',
    name: 'Kolkata Knight Riders',
    abbr: 'KKR',
    city: 'Kolkata',
    color: '#3A225D',       // purple
    secondaryColor: '#F0BC23',
  },
  {
    id: 'lsg',
    name: 'Lucknow Super Giants',
    abbr: 'LSG',
    city: 'Lucknow',
    color: '#00A99D',       // teal
    secondaryColor: '#C8A84B',
  },
  {
    id: 'mi',
    name: 'Mumbai Indians',
    abbr: 'MI',
    city: 'Mumbai',
    color: '#005DA0',       // blue
    secondaryColor: '#D4AF37',
  },
  {
    id: 'pbks',
    name: 'Punjab Kings',
    abbr: 'PBKS',
    city: 'Mohali',
    color: '#ED1B24',       // red
    secondaryColor: '#C8A84B',
  },
  {
    id: 'rr',
    name: 'Rajasthan Royals',
    abbr: 'RR',
    city: 'Jaipur',
    color: '#E8007D',       // pink
    secondaryColor: '#254AA5',
  },
  {
    id: 'rcb',
    name: 'Royal Challengers Bengaluru',
    abbr: 'RCB',
    city: 'Bengaluru',
    color: '#EC1C24',       // red
    secondaryColor: '#C8A84B',
  },
  {
    id: 'srh',
    name: 'Sunrisers Hyderabad',
    abbr: 'SRH',
    city: 'Hyderabad',
    color: '#FF822A',       // orange
    secondaryColor: '#1C1C1C',
  },
];

export const getIPLTeamById = (id: string): IPLTeam | undefined =>
  IPL_TEAMS.find((t) => t.id === id);
