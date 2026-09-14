import React from 'react';

interface UsPizzaLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'mark';
}

export const UsPizzaLogo: React.FC<UsPizzaLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
}) => {
  const heightMap = {
    sm: 24,
    md: 32,
    lg: 40,
  };

  const h = heightMap[size];

  if (variant === 'mark') {
    return (
      <svg
        width={h}
        height={h}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 ${className}`}
        aria-label="US Pizza Emblem"
      >
        <circle cx="20" cy="20" r="20" fill="#C8102E" />
        <path
          d="M20 8L30 29H10L20 8Z"
          fill="#FFFFFF"
        />
        <path d="M12 27.5H28" stroke="#C8102E" strokeWidth="2.25" strokeLinecap="round" />
        <circle cx="18" cy="18" r="1.8" fill="#C8102E" />
        <circle cx="22" cy="23" r="1.8" fill="#C8102E" />
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={h}
        height={h}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
        aria-hidden="true"
      >
        <circle cx="20" cy="20" r="20" fill="#C8102E" />
        <path d="M20 8L30 29H10L20 8Z" fill="#FFFFFF" />
        <path d="M12 27.5H28" stroke="#C8102E" strokeWidth="2.25" strokeLinecap="round" />
        <circle cx="18" cy="18" r="1.8" fill="#C8102E" />
        <circle cx="22" cy="23" r="1.8" fill="#C8102E" />
      </svg>
      <div className="flex flex-col leading-none">
          <span className="text-[15px] font-black tracking-[-0.03em] text-slate-900 uppercase">
            US <span className="text-[#C8102E]">PIZZA</span>
          </span>
        <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
          Finance
        </span>
      </div>
    </div>
  );
};
