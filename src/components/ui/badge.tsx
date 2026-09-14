import * as React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'outline' | 'positive' | 'warning' | 'negative';

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'border-slate-200 bg-slate-50 text-slate-700',
  outline: 'border-slate-300 bg-white text-slate-700',
  positive: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  negative: 'border-rose-200 bg-rose-50 text-rose-700',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

/** shadcn Badge, dependency-free, with this project's semantic tones. */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums',
        VARIANTS[variant],
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';
