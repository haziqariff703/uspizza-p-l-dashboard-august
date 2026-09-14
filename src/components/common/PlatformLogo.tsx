import React from 'react';
import { SiGrab, SiFoodpanda, SiShopee } from 'react-icons/si';
import { UsPizzaLogo } from './UsPizzaLogo';

export type PlatformType = 'Grab' | 'FoodPanda' | 'Shopee' | 'Apps' | 'POS' | 'Web' | 'GRN' | 'All';

interface PlatformLogoProps {
  platform: PlatformType | string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

/** Quiet brand marks: official colour is reserved for the glyph, while the
 * container stays on the dashboard's global white/slate surface system. */
export const PlatformLogo: React.FC<PlatformLogoProps> = ({
  platform,
  className = '',
  size = 'sm',
  showLabel = false,
}) => {
  const sizeClasses = {
    xs: 'h-3.5 w-3.5',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const sz = sizeClasses[size];
  const glyphPad = {
    xs: 'p-[1px]',
    sm: 'p-[1.5px]',
    md: 'p-0.5',
    lg: 'p-0.5',
  };

  const Mark: React.FC<{ label: string; children: React.ReactNode }> = ({
    label,
    children,
  }) => (
    <span
      className={`${sz} ${glyphPad} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white`}
      title={label}
      role="img"
      aria-label={label}
    >
      {children}
    </span>
  );

  const renderIcon = () => {
    switch (platform) {
      case 'Grab':
        return (
          <Mark label="Grab"><SiGrab size="100%" color="#00B14F" aria-hidden="true" /></Mark>
        );

      case 'FoodPanda':
        return (
          <Mark label="FoodPanda"><SiFoodpanda size="100%" color="#D70F64" aria-hidden="true" /></Mark>
        );

      case 'Shopee':
        return (
          <Mark label="Shopee"><SiShopee size="100%" color="#EE4D2D" aria-hidden="true" /></Mark>
        );

      case 'Apps':
      case 'Web':
        return (
          <Mark label="US Pizza App">
            <UsPizzaLogo size="sm" variant="mark" className="[&>svg]:h-full [&>svg]:w-full" />
          </Mark>
        );

      case 'POS':
        return (
          <Mark label="POS">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full" aria-hidden="true">
              <rect x="4" y="3.5" width="16" height="9.5" rx="1.2" stroke="#334155" strokeWidth="1.4" />
              <line x1="6.5" y1="6.5" x2="17.5" y2="6.5" stroke="#334155" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="6.5" y1="9.5" x2="13.5" y2="9.5" stroke="#334155" strokeWidth="1.4" strokeLinecap="round" />
              <rect x="4.5" y="15" width="15" height="4" rx="0.6" stroke="#334155" strokeWidth="1.2" />
              <circle cx="7" cy="17" r="0.7" fill="#334155" />
              <circle cx="10" cy="17" r="0.7" fill="#334155" />
              <circle cx="13" cy="17" r="0.7" fill="#334155" />
            </svg>
          </Mark>
        );

      case 'GRN':
        return (
          <Mark label="GRN">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full" aria-hidden="true">
              <path d="M4 5H20M4 10H20M4 15H14" stroke="#C8102E" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </Mark>
        );

      default:
        return (
          <Mark label={typeof platform === 'string' ? platform : 'Channel'}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full" aria-hidden="true">
              <circle cx="12" cy="12" r="4" fill="#64748B" />
            </svg>
          </Mark>
        );
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
      {renderIcon()}
      {showLabel && <span className="font-semibold">{platform}</span>}
    </span>
  );
};
