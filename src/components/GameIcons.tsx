import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

// 1. Cricket Bat & Ball (Signature Sport Mark)
export function CricketBatBallIcon({ size = 20, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Cricket Bat */}
      <path 
        d="M6.5 17.5L16.2 7.8C16.8 7.2 17.7 7.2 18.3 7.8L19.2 8.7C19.8 9.3 19.8 10.2 19.2 10.8L9.5 20.5C9 21 8.2 21 7.7 20.5L6.5 19.3C6 18.8 6 18 6.5 17.5Z" 
        stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M18 9L21.5 5.5C22 5 22 4.2 21.5 3.7L20.3 2.5C19.8 2 19 2 18.5 2.5L15 6" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10 14L13 17" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Cricket Ball with Seam */}
      <circle cx="5" cy="5" r="3.5" stroke={color} strokeWidth="1.8"/>
      <path d="M3.2 3.2C4.5 4.5 5.5 5.5 6.8 6.8" stroke={color} strokeWidth="1.2" strokeDasharray="1 1.2"/>
    </svg>
  );
}

// 2. Auction Gavel / Hammer (Strike Action)
export function GavelIcon({ size = 20, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      {/* Hammer Head */}
      <path d="M14.5 3.5L20.5 9.5L18 12L12 6L14.5 3.5Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M16 2L22 8" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M10.5 7.5L16.5 13.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Handle */}
      <path d="M15 9L5.5 18.5C4.7 19.3 3.5 19.3 2.7 18.5C1.9 17.7 1.9 16.5 2.7 15.7L12 6.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      {/* Sound Block / Impact Base */}
      <path d="M8 21H18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 18L11 21M16 18L15 21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// 3. Timer Gauge / Countdown Stopwatch
export function TimerGaugeIcon({ size = 20, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="13" r="8" stroke={color} strokeWidth="1.8"/>
      <path d="M12 9V13L15 15" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 2V5M10 2H14" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M18.5 6.5L20 5M4 5L5.5 6.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// 4. Purse / Coins / Currency HUD
export function PurseCoinsIcon({ size = 20, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="6" width="20" height="14" rx="3" stroke={color} strokeWidth="1.8"/>
      <path d="M2 10H22" stroke={color} strokeWidth="1.5"/>
      <circle cx="16" cy="14" r="2" stroke={color} strokeWidth="1.8"/>
      <path d="M6 6V4C6 2.9 6.9 2 8 2H16C17.1 2 18 2.9 18 4V6" stroke={color} strokeWidth="1.8"/>
    </svg>
  );
}

// 5. Championship Trophy
export function TrophyCupIcon({ size = 20, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 3H18V10C18 13.3 15.3 16 12 16C8.7 16 6 13.3 6 10V3Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M6 5H3C2.4 5 2 5.4 2 6C2 8.8 4.2 11 7 11H7.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M18 5H21C21.6 5 22 5.4 22 6C22 8.8 19.8 11 17 11H16.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 16V19M8 21H16M10 19H14" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// 6. Crown (Host / Champion)
export function CrownHostIcon({ size = 20, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 18L5 8L9.5 13L12 5L14.5 13L19 8L21 18H3Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <circle cx="12" cy="4" r="1" fill={color}/>
      <circle cx="5" cy="7" r="1" fill={color}/>
      <circle cx="19" cy="7" r="1" fill={color}/>
      <path d="M4 21H20" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

// 7. Shield / Crest
export function ShieldCrestIcon({ size = 20, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L4 5.5V11C4 16.5 7.4 21.6 12 22.8C16.6 21.6 20 16.5 20 11V5.5L12 2Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M12 6V18M8 10L12 6L16 10" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// 8. Role: Batter (Crossed Bats & Stumps)
export function RoleBatterIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 20L15 9L18 12L7 23L4 20Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M15 9L19 5L21 7L17 11" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="6" cy="6" r="3" stroke={color} strokeWidth="1.8"/>
    </svg>
  );
}

// 9. Role: Bowler (Fast Seam Ball & Velocity)
export function RoleBowlerIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.8"/>
      <path d="M8 6C10 9 10 15 8 18M16 6C14 9 14 15 16 18" stroke={color} strokeWidth="1.6" strokeDasharray="1.5 1.5"/>
      <path d="M12 4V20" stroke={color} strokeWidth="1.8"/>
      <path d="M19 3L22 6M2 18L5 21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// 10. Role: All-Rounder (Star & Dual Energy Crest)
export function RoleAllRounderIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polygon points="12 2 15 8.5 22 9.5 17 14.5 18.5 21.5 12 18 5.5 21.5 7 14.5 2 9.5 9 8.5 12 2" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}

// 11. Role: Wicket-Keeper (Gloves & Stumps)
export function RoleWicketKeeperIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M7 4V20M12 4V20M17 4V20M5 4H19" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <rect x="3" y="16" width="18" height="5" rx="1.5" stroke={color} strokeWidth="1.8"/>
    </svg>
  );
}

// 12. Overseas / International Globe
export function OverseasGlobeIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.8"/>
      <path d="M3 12H21" stroke={color} strokeWidth="1.5"/>
      <path d="M12 3C15 6 16.5 9 16.5 12C16.5 15 15 18 12 21C9 18 7.5 15 7.5 12C7.5 9 9 6 12 3Z" stroke={color} strokeWidth="1.6"/>
    </svg>
  );
}

// 13. Private Room Lock (Cyber Padlock)
export function PrivateLockIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="10" width="16" height="12" rx="2.5" stroke={color} strokeWidth="1.8"/>
      <path d="M7 10V6.5C7 3.7 9.2 1.5 12 1.5C14.8 1.5 17 3.7 17 6.5V10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="12" cy="15.5" r="1.5" fill={color}/>
      <path d="M12 17V19" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// 14. Tactical Chat / Comms
export function TacticalChatIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M20 4H4C2.9 4 2 4.9 2 6V16C2 17.1 2.9 18 4 18H7V22L12 18H20C21.1 18 22 17.1 22 16V6C22 4.9 21.1 4 20 4Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M7 11H17M7 8H13" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// 15. AI Bot / Autonomous Engine
export function BotsAiIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="4" y="6" width="16" height="13" rx="3" stroke={color} strokeWidth="1.8"/>
      <path d="M12 2V6M9 2H15" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="9" cy="12" r="1.5" fill={color}/>
      <circle cx="15" cy="12" r="1.5" fill={color}/>
      <path d="M8 16H16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M2 13H4M20 13H22" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// 16. Sound / Audio Wave
export function SoundWaveIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M15.5 8.5C16.8 9.8 17.5 11.5 17.5 13.5C17.5 15.5 16.8 17.2 15.5 18.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M19 5C21.2 7.2 22.5 10.2 22.5 13.5C22.5 16.8 21.2 19.8 19 22" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// 17. Navigation & Actions
export function ShareInviteIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="18" cy="5" r="3" stroke={color} strokeWidth="1.8"/>
      <circle cx="6" cy="12" r="3" stroke={color} strokeWidth="1.8"/>
      <circle cx="18" cy="19" r="3" stroke={color} strokeWidth="1.8"/>
      <path d="M8.6 13.5L15.4 17.5M15.4 6.5L8.6 10.5" stroke={color} strokeWidth="1.8"/>
    </svg>
  );
}

export function PlayArrowIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polygon points="6 4 20 12 6 20 6 4" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

export function PauseIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="6" y="5" width="4" height="14" rx="1" fill={color}/>
      <rect x="14" y="5" width="4" height="14" rx="1" fill={color}/>
    </svg>
  );
}

export function FastForwardIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polygon points="4 5 13 12 4 19 4 5" fill={color}/>
      <polygon points="12 5 21 12 12 19 12 5" fill={color}/>
    </svg>
  );
}

export function CheckmarkIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 12.5L9.5 18L20 6" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function CloseIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function FlameFireIcon({ size = 18, className = '', color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2C10.5 5 8 7 8 10C8 10.9 8.2 11.7 8.6 12.4C6.5 13.3 5 15.5 5 18C5 20.8 7.2 23 10 23C13.8 23 15 19.5 15 17C15 15.2 14.1 13.8 13.2 12.8C15.6 12.5 18 10.5 18 7C18 5 16.5 3.5 15.5 2C14.5 4 13.5 5 12 2Z" stroke={color} strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M11 18C11 16.5 12 15.5 12.5 14.5C13 15.5 13.5 16.2 13.5 17C13.5 18.1 12.6 19 11.5 19C11.2 19 11 18.5 11 18Z" fill={color}/>
    </svg>
  );
}
