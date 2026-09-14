import React, { useState } from 'react';
import { Calendar as CalendarDays, CheckCircle as CheckCircle2, Download, Page as FileSpreadsheet, Spark as Sparkles } from 'iconoir-react';
import { OverviewSection } from './OverviewSection';
import { CommissionFeesSection } from './CommissionFeesSection';
import { DataCoverageSection } from './DataCoverageSection';
import { ChannelFilter, DashboardSection, OutletFinancialData } from '../../types';
import { copy } from '../../copy';

interface SalesDashboardProps {
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
  /** Set in the navbar; drives every platform breakdown below. */
  channelFilter: ChannelFilter;
  /** Which section to show — picked from the navbar dropdown. */
  section: DashboardSection;
  outlets: OutletFinancialData[];
  onGoToTasks: () => void;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({
  entityFilter,
  channelFilter,
  section,
  outlets,
  onGoToTasks,
}) => {
  const [exportNotice, setExportNotice] = useState(false);

  const handleExport = () => {
    setExportNotice(true);
    setTimeout(() => setExportNotice(false), 3000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Dashboard Sub-Header */}
      <header className="flex flex-wrap items-end justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#C8102E]" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              {copy.dashEyebrow}
            </span>
          </div>
          <h1 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            {copy.dashTitle}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
            <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
            <span>{copy.dashReporting}</span>
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg bg-[#0B192C] hover:bg-[#1E293B] active:bg-[#020617] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition-colors"
            title="Export reconciled figures to CSV"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{copy.dashExportCsv}</span>
          </button>
        </div>
      </header>

      {/* Export feedback toast */}
      {exportNotice && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 animate-in fade-in slide-in-from-top-1">
          {copy.dashExportReady}
        </div>
      )}

      {/* Section Views */}
      {section === 'overview' && <OverviewSection entityFilter={entityFilter} channelFilter={channelFilter} />}
      {section === 'fees' && <CommissionFeesSection channelFilter={channelFilter} />}
      {section === 'coverage' && <DataCoverageSection outlets={outlets} onGoToTasks={onGoToTasks} />}
    </div>
  );
};
