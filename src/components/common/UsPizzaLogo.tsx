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
        {/* Outer Roundel */}
        <circle cx="20" cy="20" r="20" fill="#C8102E" />
        {/* Inner Ring Accent */}
        <circle cx="20" cy="20" r="18" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
        {/* Stylized Pizza Slice Silhouette */}
        <path
          d="M20 7L30.5 28.5C27 30.5 23.5 31.5 20 31.5C16.5 31.5 13 30.5 9.5 28.5L20 7Z"
          fill="#FFFFFF"
        />
        {/* Crust line */}
        <path
          d="M10 28C13.2 29.8 16.5 30.8 20 30.8C23.5 30.8 26.8 29.8 30 28"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Pepperoni Dot Accents */}
        <circle cx="18" cy="18" r="2.2" fill="#C8102E" />
        <circle cx="22.5" cy="23" r="2" fill="#C8102E" />
        <circle cx="16.5" cy="24.5" r="1.8" fill="#C8102E" />
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
        <circle cx="20" cy="20" r="18" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.3" fill="none" />
        <path
          d="M20 7L30.5 28.5C27 30.5 23.5 31.5 20 31.5C16.5 31.5 13 30.5 9.5 28.5L20 7Z"
          fill="#FFFFFF"
        />
        <path
          d="M10 28C13.2 29.8 16.5 30.8 20 30.8C23.5 30.8 26.8 29.8 30 28"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="18" cy="18" r="2.2" fill="#C8102E" />
        <circle cx="22.5" cy="23" r="2" fill="#C8102E" />
        <circle cx="16.5" cy="24.5" r="1.8" fill="#C8102E" />
      </svg>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[15px] font-black tracking-tight text-slate-900 uppercase">
            US <span className="text-[#C8102E]">PIZZA</span>
          </span>
          <span className="rounded bg-rose-50 px-1 py-0.5 text-[9px] font-bold tracking-wider text-[#C8102E] border border-rose-200">
            MY
          </span>
        </div>
        <span className="text-[9px] font-semibold tracking-wider text-slate-500 uppercase mt-0.5">
          FINANCE &amp; RECONCILIATION
        </span>
      </div>
    </div>
  );
};
