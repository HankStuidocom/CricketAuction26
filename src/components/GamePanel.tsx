import React from 'react';

interface GamePanelProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  glow?: 'lime' | 'cyan' | 'gold' | 'red' | 'none';
  accentColor?: string; // Optional custom team accent bar
  className?: string;
  headerClassName?: string;
  noPadding?: boolean;
}

export default function GamePanel({
  children,
  title,
  subtitle,
  badge,
  action,
  glow = 'none',
  accentColor,
  className = '',
  headerClassName = '',
  noPadding = false,
}: GamePanelProps) {

  const glowStyles = {
    none: 'shadow-[0_8px_32px_rgba(0,0,0,0.6)]',
    lime: 'shadow-[0_0_30px_rgba(217,255,77,0.18),0_8px_32px_rgba(0,0,0,0.7)] border-lime-500/30',
    cyan: 'shadow-[0_0_30px_rgba(0,229,255,0.18),0_8px_32px_rgba(0,0,0,0.7)] border-cyan-500/30',
    gold: 'shadow-[0_0_30px_rgba(255,184,0,0.18),0_8px_32px_rgba(0,0,0,0.7)] border-amber-500/30',
    red: 'shadow-[0_0_30px_rgba(255,51,102,0.18),0_8px_32px_rgba(0,0,0,0.7)] border-red-500/30',
  };

  return (
    <div 
      className={`
        relative rounded-2xl overflow-hidden
        bg-gradient-to-b from-[#0B1730]/95 via-[#060E1E]/95 to-[#030814]/98
        border border-white/12
        backdrop-blur-xl
        transition-all duration-200
        ${glowStyles[glow]}
        ${className}
      `}
    >
      {/* Top subtle highlight reflection */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none" />

      {/* Optional Team Accent color strip */}
      {accentColor && (
        <div 
          className="absolute top-0 left-0 right-0 h-1 z-10 shadow-[0_0_12px_currentColor]"
          style={{ backgroundColor: accentColor, color: accentColor }}
        />
      )}

      {/* Panel Header */}
      {(title || subtitle || badge || action) && (
        <div className={`flex items-center justify-between px-4 py-3 border-b border-white/8 bg-white/[0.02] ${headerClassName}`}>
          <div className="flex items-center gap-2 min-w-0">
            {title && (
              <div>
                <h3 className="font-['Manrope'] font-extrabold text-xs sm:text-sm text-white tracking-wide uppercase flex items-center gap-2">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-[10px] text-[#8993A8] font-medium tracking-normal normal-case mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            )}
            {badge && <div className="ml-2">{badge}</div>}
          </div>

          {action && <div className="flex-shrink-0 ml-3">{action}</div>}
        </div>
      )}

      {/* Panel Body */}
      <div className={noPadding ? '' : 'p-4 sm:p-5'}>
        {children}
      </div>
    </div>
  );
}
