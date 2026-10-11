import React from 'react';

interface GamePanelProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  glow?: 'coral' | 'lime' | 'cyan' | 'gold' | 'red' | 'none';
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
    none: 'shadow-[0_4px_20px_rgba(0,0,0,0.5)]',
    coral: 'shadow-[0_0_24px_rgba(16,185,129,0.25)] border-[#10B981]/40',
    lime: 'shadow-[0_0_24px_rgba(78,222,163,0.25)] border-[#4EDEA3]/40',
    cyan: 'shadow-[0_0_24px_rgba(6,182,212,0.25)] border-[#06B6D4]/40',
    gold: 'shadow-[0_0_24px_rgba(245,158,11,0.25)] border-[#F59E0B]/40',
    red: 'shadow-[0_0_24px_rgba(239,68,68,0.25)] border-[#EF4444]/40',
  };

  return (
    <div 
      className={`
        relative rounded-[6px] overflow-hidden
        bg-[#111827]
        border border-[#1F2937]
        backdrop-blur-xl
        transition-all duration-200
        ${glowStyles[glow]}
        ${className}
      `}
    >
      {/* Top architectural demarcation reflection */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#86948A]/20 to-transparent pointer-events-none" />

      {/* Optional Accent color strip */}
      {accentColor && (
        <div 
          className="absolute top-0 left-0 right-0 h-[3px] z-10"
          style={{ backgroundColor: accentColor }}
        />
      )}

      {/* Panel Header */}
      {(title || subtitle || badge || action) && (
        <div className={`flex items-center justify-between px-3.5 py-2.5 border-b border-[#1F2937] bg-[#0F131C] ${headerClassName}`}>
          <div className="flex items-center gap-2 min-w-0">
            {title && (
              <div>
                <h3 className="font-['Outfit'] font-bold text-xs sm:text-sm text-[#DFE2EF] tracking-wider uppercase flex items-center gap-2">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-[10px] text-[#86948A] font-medium tracking-normal normal-case mt-0.5">
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
