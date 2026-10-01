import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ToggleGroupOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface ToggleGroupProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: ToggleGroupOption<T>[];
  'aria-label': string;
  className?: string;
}

/** shadcn ToggleGroup (single), dependency-free: a segmented radio group with arrow-key support. */
export function ToggleGroup<T extends string>({ value, onValueChange, options, className, ...aria }: ToggleGroupProps<T>) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + (e.key === 'ArrowRight' ? 1 : options.length - 1)) % options.length];
    onValueChange(next.value);
    (e.currentTarget.querySelector(`[data-value="${next.value}"]`) as HTMLButtonElement | null)?.focus();
  };
  return (
    <div role="radiogroup" aria-label={aria['aria-label']} onKeyDown={onKeyDown} className={cn('inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-value={o.value}
            tabIndex={active ? 0 : -1}
            onClick={() => onValueChange(o.value)}
            className={cn(
              'inline-flex min-h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]',
              active ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
