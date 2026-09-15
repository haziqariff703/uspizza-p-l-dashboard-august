import * as React from 'react';
import { cn } from '../../lib/utils';

/** shadcn Input, dependency-free, matching this project's control sizing (Button/Badge). */
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'min-h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#C8102E] focus:outline-none focus:ring-1 focus:ring-[#C8102E] disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
