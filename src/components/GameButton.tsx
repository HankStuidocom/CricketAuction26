import React from 'react';

export type GameButtonVariant = 'primary' | 'secondary' | 'coral' | 'lime' | 'cyan' | 'gold' | 'danger' | 'inverted' | 'outlined' | 'glass' | 'dark';
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
  
  // Base styling: Tactical Pitch Command precision, Outfit typography, architectural borders
  const baseStyles = "relative inline-flex items-center justify-center font-['Outfit'] font-bold uppercase tracking-wider transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:transform-none disabled:shadow-none active:translate-y-0.5";

  const sizeStyles: Record<GameButtonSize, string> = {
    sm: "text-[11px] py-1.5 px-3 rounded-[4px] gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]",
    md: "text-xs py-2 px-4 rounded-[6px] gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]",
    lg: "text-sm py-2.5 px-5 rounded-[6px] gap-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
    xl: "text-base py-3.5 px-7 rounded-[8px] gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
  };

  const variantStyles: Record<GameButtonVariant, string> = {
    // 1. Primary Tactical Action (#10B981 Emerald with #090D16 dark text, Outfit font, inner glow)
    primary: "bg-[#10B981] hover:bg-[#059669] text-[#090D16] border border-[#10B981]/50 shadow-[0_0_20px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_0_26px_rgba(16,185,129,0.5)] font-extrabold",
    coral: "bg-[#10B981] hover:bg-[#059669] text-[#090D16] border border-[#10B981]/50 shadow-[0_0_20px_rgba(16,185,129,0.35),inset_0_1px_0_rgba(255,255,255,0.3)] font-extrabold",
    lime: "bg-[#4EDEA3] hover:bg-[#10B981] text-[#003824] border border-[#4EDEA3]/50 shadow-[0_0_20px_rgba(78,222,163,0.35)] font-extrabold",

    // 2. Secondary Command Action (Transparent / #1C1F29, border #1F2937, text #DFE2EF, hover border #06B6D4)
    secondary: "bg-[#1C1F29] hover:bg-[#1A2234] text-[#DFE2EF] border border-[#1F2937] hover:border-[#06B6D4] hover:text-white shadow-[0_2px_8px_rgba(0,0,0,0.4)]",

    // 3. Tactical Cyan
    cyan: "bg-[#06B6D4] hover:bg-[#0891B2] text-[#003640] border border-[#06B6D4]/50 shadow-[0_0_20px_rgba(6,182,212,0.35)] font-extrabold",

    // 4. Championship Gold
    gold: "bg-[#F59E0B] hover:bg-[#D97706] text-[#472A00] border border-[#F59E0B]/50 shadow-[0_0_20px_rgba(245,158,11,0.35)] font-extrabold",

    // 5. Destructive / Crimson Emergency
    danger: "bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#FFB4AB] border border-[#EF4444]/60 shadow-[0_0_16px_rgba(239,68,68,0.25)]",

    // 6. Inverted Action
    inverted: "bg-[#DFE2EF] hover:bg-[#FFFFFF] text-[#0F131C] border border-white/20 shadow-md font-bold",

    // 7. Outlined Action
    outlined: "bg-transparent hover:bg-[#181B25] text-[#DFE2EF] border border-[#3C4A42] hover:border-[#86948A]",

    // 8. Tactical Glass
    glass: "bg-[#111827]/90 hover:bg-[#1A2234] text-[#DFE2EF] hover:text-white border border-[#1F2937] hover:border-[#3C4A42] backdrop-blur-md shadow-sm",

    // 9. Deep Dark
    dark: "bg-[#0F131C] hover:bg-[#181B25] text-[#BBCABF] hover:text-[#DFE2EF] border border-[#1F2937]"
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
