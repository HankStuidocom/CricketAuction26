import React from 'react';

export type GameButtonVariant = 'primary' | 'cyan' | 'gold' | 'danger' | 'glass' | 'dark';
export type GameButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GameButtonVariant;
  size?: GameButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
}

export default function GameButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  iconRight,
  loading = false,
  className = '',
  disabled,
  ...props
}: GameButtonProps) {
  
  // Base styling: tactile gaming feel, sports typography, bevel border, active press state
  const baseStyles = "relative inline-flex items-center justify-center font-['Manrope'] font-black uppercase tracking-wider transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:transform-none disabled:shadow-none active:translate-y-0.5";

  const sizeStyles: Record<GameButtonSize, string> = {
    sm: "text-[10px] py-1.5 px-3 rounded-lg gap-1.5 shadow-[0_2px_0_rgba(0,0,0,0.4)] active:shadow-none",
    md: "text-xs py-2.5 px-4 rounded-xl gap-2 shadow-[0_3px_0_rgba(0,0,0,0.5)] active:shadow-none",
    lg: "text-sm py-3.5 px-6 rounded-xl gap-2.5 shadow-[0_4px_0_rgba(0,0,0,0.6)] active:shadow-none",
    xl: "text-base py-4.5 px-8 rounded-2xl gap-3 shadow-[0_5px_0_rgba(0,0,0,0.7)] active:shadow-none"
  };

  const variantStyles: Record<GameButtonVariant, string> = {
    // 1. Electric Lime (Primary Bidding & CTAs)
    primary: "bg-gradient-to-b from-[#E7FF70] via-[#D9FF4D] to-[#B8E619] text-[#051120] border-t border-white/60 border-b border-[#82A800] shadow-[0_4px_20px_rgba(217,255,77,0.35)] hover:brightness-105 hover:shadow-[0_6px_25px_rgba(217,255,77,0.5)]",
    
    // 2. Cyber Cyan (Esports Match / Host)
    cyan: "bg-gradient-to-b from-[#40E0D0] via-[#00C6FF] to-[#0072FF] text-[#020B18] border-t border-white/60 border-b border-[#004B99] shadow-[0_4px_20px_rgba(0,198,255,0.35)] hover:brightness-105",

    // 3. Gold Champion (Points / Trophy / Winner)
    gold: "bg-gradient-to-b from-[#FFE259] via-[#FFA751] to-[#FF8C00] text-[#0A0E1A] border-t border-white/60 border-b border-[#B35F00] shadow-[0_4px_20px_rgba(255,167,81,0.35)] hover:brightness-105",

    // 4. Crimson Danger (Skip / Unsold / End)
    danger: "bg-gradient-to-b from-[#FF512F] via-[#DD2476] to-[#A00E4A] text-white border-t border-white/40 border-b border-[#700A34] shadow-[0_4px_16px_rgba(221,36,118,0.3)] hover:brightness-105",

    // 5. Tactical Glass (Secondary actions, filters, tabs)
    glass: "bg-white/[0.07] hover:bg-white/[0.14] text-[#E2E8F0] hover:text-white border border-white/15 hover:border-white/30 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.4)]",

    // 6. Deep Dark (Subtle / Panel footer actions)
    dark: "bg-[#0A162B] hover:bg-[#0F2140] text-[#8993A8] hover:text-white border border-white/10 hover:border-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {/* Metallic top reflection line */}
      <span className="absolute inset-x-2 top-0.5 h-[1px] bg-white/25 pointer-events-none rounded-t" />

      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span>{children}</span>
          {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
        </>
      )}
    </button>
  );
}
