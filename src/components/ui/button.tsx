import * as React from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'default' | 'outline' | 'secondary' | 'destructive';

const variants: Record<ButtonVariant, string> = {
  default: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950',
  outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 active:bg-slate-100',
  secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300',
  destructive: 'bg-rose-700 text-white hover:bg-rose-800 active:bg-rose-900',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: ButtonVariant; }

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn('inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', variants[variant], className)} {...props} />
  )
);
Button.displayName = 'Button';
