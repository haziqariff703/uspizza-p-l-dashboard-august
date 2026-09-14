import React from 'react';

interface SectionHeadingProps {
  number: number;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}

/** The numbered section header used by every dashboard section. */
export const SectionHeading: React.FC<SectionHeadingProps> = ({ number, title, subtitle, action }) => (
  <div className="flex flex-wrap items-start justify-between gap-3">
    <div className="flex items-start gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C8102E] text-sm font-bold text-white">
        {number}
      </span>
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
    {action}
  </div>
);
