import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface DataCoverageSectionProps {
  onGoToTasks: () => void;
}

export const DataCoverageSection: React.FC<DataCoverageSectionProps> = ({ onGoToTasks }) => {
  return (
    <div className="bg-emerald-50/40 p-5 sm:p-6 rounded-2xl border border-emerald-200 shadow-2xs space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            3
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Data Coverage
            </h2>
            <p className="text-xs text-slate-600">
              Tracks whether every trading outlet has all 5 channel reports for the period
            </p>
          </div>
        </div>

        <button
          onClick={onGoToTasks}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-2xs"
        >
          <span>View Verification Tasks</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 5 Channel Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {['POS', 'Grab', 'FoodPanda', 'Shopee', 'Web'].map((channel) => (
          <div 
            key={channel}
            className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between"
          >
            <div className="text-xs font-bold text-slate-800">
              {channel}
            </div>
            <div className="mt-2 text-sm font-extrabold text-emerald-700 flex items-center gap-1">
              ✓ complete
            </div>
          </div>
        ))}
      </div>

      {/* Complete status banner */}
      <div className="bg-white p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-900 font-semibold flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>✓ All 44 trading outlets (44) have complete reports across every channel for May 2026.</span>
      </div>

      {/* Upcoming outlets callout */}
      <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-200 text-xs text-sky-950 space-y-1">
        <div className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">
          UPCOMING OUTLETS — NOT YET TRADING (NO DATA EXPECTED)
        </div>
        <div className="text-slate-800">
          <strong>Taman Connaught</strong> <span className="font-mono text-slate-500">MY-051</span> — Under renovation — grand launch soon
        </div>
        <div className="text-slate-800">
          <strong>Kota Damansara</strong> <span className="font-mono text-slate-500">MY-081</span> — Not yet open
        </div>
      </div>

      <div className="text-[11px] text-slate-500">
        Web (app) sales for May 2026 come from <span className="font-mono font-bold text-slate-700">WEB ORDER 1-31MAY.csv</span>.
      </div>
    </div>
  );
};
