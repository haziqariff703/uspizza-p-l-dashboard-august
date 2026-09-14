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

/**
 * Brand tiles rendered as rounded (rx=5 equivalent) brand-hex squares.
 * Grab / FoodPanda / Shopee use official Simple Icons marks; Apps & Web use the
 * US Pizza emblem at xs; POS / GRN keep their custom glyphs.
 */
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
    xs: 'p-[2px]',
    sm: 'p-[2.5px]',
    md: 'p-[3px]',
    lg: 'p-[3.5px]',
  };

  const Tile: React.FC<{ bg: string; label: string; children: React.ReactNode }> = ({
    bg,
    label,
    children,
  }) => (
    <span
      className={`${sz} ${glyphPad} inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[5px]`}
      style={{ backgroundColor: bg }}
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
          <Tile bg="#00B14F" label="Grab">
            <SiGrab size="100%" color="#FFFFFF" aria-hidden="true" />
          </Tile>
        );

      case 'FoodPanda':
        return (
          <Tile bg="#D70F64" label="FoodPanda">
            <SiFoodpanda size="100%" color="#FFFFFF" aria-hidden="true" />
          </Tile>
        );

      case 'Shopee':
        return (
          <Tile bg="#EE4D2D" label="Shopee">
            <SiShopee size="100%" color="#FFFFFF" aria-hidden="true" />
          </Tile>
        );

      case 'Apps':
      case 'Web':
        return (
          <Tile bg="#C8102E" label="US Pizza App">
            <UsPizzaLogo size="sm" variant="mark" className="[&>svg]:h-full [&>svg]:w-full" />
          </Tile>
        );

      case 'POS':
        return (
          <Tile bg="#334155" label="POS">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full" aria-hidden="true">
              <rect x="4" y="3.5" width="16" height="9.5" rx="1.2" fill="white" />
              <line x1="6.5" y1="6.5" x2="17.5" y2="6.5" stroke="#334155" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="6.5" y1="9.5" x2="13.5" y2="9.5" stroke="#334155" strokeWidth="1.4" strokeLinecap="round" />
              <rect x="4.5" y="15" width="15" height="4" rx="0.6" fill="white" fillOpacity="0.85" />
              <circle cx="7" cy="17" r="0.7" fill="#334155" />
              <circle cx="10" cy="17" r="0.7" fill="#334155" />
              <circle cx="13" cy="17" r="0.7" fill="#334155" />
            </svg>
          </Tile>
        );

      case 'GRN':
        return (
          <Tile bg="#0284C7" label="GRN">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full" aria-hidden="true">
              <path d="M4 5H20M4 10H20M4 15H14" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </Tile>
        );

      default:
        return (
          <Tile bg="#64748B" label={typeof platform === 'string' ? platform : 'Channel'}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full" aria-hidden="true">
              <circle cx="12" cy="12" r="4" fill="white" />
            </svg>
          </Tile>
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
