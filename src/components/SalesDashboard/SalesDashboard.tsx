import React, { useCallback, useState } from 'react';
import { Calendar as CalendarDays, CheckCircle as CheckCircle2, Download, Page as FileSpreadsheet, Spark as Sparkles, Upload } from 'iconoir-react';
import { OverviewPage } from '../../pages/overview/OverviewPage';
import { CommissionFeesPage } from '../../pages/fees/CommissionFeesPage';
import { DataCoveragePage } from '../../pages/coverage/DataCoveragePage';
import { SalesByOutletPage } from '../../pages/sales-by-outlet/SalesByOutletPage';
import { PurchasesByOutletPage } from '../../pages/purchases-by-outlet/PurchasesByOutletPage';
import { PurchasesToNetSalesPage } from '../../pages/purchases-to-net-sales/PurchasesToNetSalesPage';
import { PLByOutletPage } from '../../pages/pl-by-outlet/PLByOutletPage';
import { ChannelFilter, DashboardSection, OutletFinancialData } from '../../types';
import { copy } from '../../copy';
import { SalesImportModal } from './SalesImportModal';
import { ImportedSalesSection } from './ImportedSalesSection';
import { AuthControl } from './AuthControl';

const REPORTING_MONTHS = [
  { value: '2026-05', label: 'May 2026', status: 'Sample data ready' },
  { value: '2026-06', label: 'June 2026', status: 'Awaiting import' },
  { value: '2026-07', label: 'July 2026', status: 'Awaiting import' },
  { value: '2026-08', label: 'August 2026', status: 'Awaiting import' },
  { value: '2026-09', label: 'September 2026', status: 'Awaiting import' },
  { value: '2026-10', label: 'October 2026', status: 'Awaiting import' },
  { value: '2026-11', label: 'November 2026', status: 'Awaiting import' },
  { value: '2026-12', label: 'December 2026', status: 'Awaiting import' },
] as const;

interface SalesDashboardProps {
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
  /** Set in the navbar; drives every platform breakdown below. */
  channelFilter: ChannelFilter;
  /** Which section to show — picked from the navbar dropdown. */
  section: DashboardSection;
  outlets: OutletFinancialData[];
  onGoToTasks: () => void;
  /** Outlet code the navbar search jumped to (P&L by Outlet only). */
  selectedOutletCode?: string | null;
  onSelectOutlet?: (code: string) => void;
  /** Lets the overview's entity cards scope the dashboard. */
  onEntityFilterChange?: (filter: 'all' | 'myUsPizza' | 'sabah') => void;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({
  entityFilter,
  channelFilter,
  section,
  outlets,
  onGoToTasks,
  selectedOutletCode,
  onSelectOutlet,
  onEntityFilterChange,
}) => {
  const [exportNotice, setExportNotice] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [importRefreshToken, setImportRefreshToken] = useState(0);
  // A sign-in, sign-out or account change bumps this token, which is what makes
  // ImportedSalesSection drop the previous user's figures and reload its own.
  const handleSessionChange = useCallback(() => setImportRefreshToken((token) => token + 1), []);
  const [reportingMonth, setReportingMonth] = useState<(typeof REPORTING_MONTHS)[number]['value']>('2026-05');
  const selectedMonth = REPORTING_MONTHS.find((month) => month.value === reportingMonth) ?? REPORTING_MONTHS[0];
  const hasDashboardData = reportingMonth === '2026-05';

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
            {hasDashboardData ? copy.dashTitle : `${selectedMonth.label} P&L`}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
            <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
            <span className="sr-only">Reporting month</span>
            <select
              value={reportingMonth}
              onChange={(event) => setReportingMonth(event.target.value as (typeof REPORTING_MONTHS)[number]['value'])}
              className="bg-transparent pr-1 font-bold text-slate-700 outline-none"
              aria-label="Reporting month"
            >
              {REPORTING_MONTHS.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
            </select>
          </label>

          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[#C8102E] bg-white px-3.5 py-1.5 text-xs font-bold text-[#C8102E] shadow-xs transition-colors hover:bg-rose-50"
            title="Import monthly sales Excel files"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Import Sales</span>
          </button>

          <AuthControl onSessionChange={handleSessionChange} />

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

      {importNotice && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-800 animate-in fade-in slide-in-from-top-1">
          {importNotice}
        </div>
      )}

      {isImportOpen && (
        <SalesImportModal
          reportingMonth={reportingMonth}
          onClose={() => setIsImportOpen(false)}
          onComplete={(message) => {
            setImportNotice(message);
            setImportRefreshToken((token) => token + 1);
            setTimeout(() => setImportNotice(null), 4000);
          }}
        />
      )}

      {!hasDashboardData && <ImportedSalesSection reportingMonth={reportingMonth} refreshToken={importRefreshToken} entityFilter={entityFilter} channelFilter={channelFilter} section={section} onEntityFilterChange={onEntityFilterChange} />}

      {/* Section Views */}
      {hasDashboardData && section === 'overview' && (
        <OverviewPage
          entityFilter={entityFilter}
          channelFilter={channelFilter}
          onEntityFilterChange={onEntityFilterChange}
        />
      )}
      {hasDashboardData && section === 'fees' && <CommissionFeesPage channelFilter={channelFilter} />}
      {hasDashboardData && section === 'coverage' && <DataCoveragePage outlets={outlets} onGoToTasks={onGoToTasks} />}
      {hasDashboardData && section === 'salesByOutlet' && <SalesByOutletPage entityFilter={entityFilter} />}
      {hasDashboardData && section === 'purchasesByOutlet' && <PurchasesByOutletPage entityFilter={entityFilter} />}
      {hasDashboardData && section === 'purchasesToNetSales' && <PurchasesToNetSalesPage entityFilter={entityFilter} />}
      {hasDashboardData && section === 'plByOutlet' && (
        <PLByOutletPage
          selectedCode={selectedOutletCode}
          onSelectOutlet={onSelectOutlet}
          entityFilter={entityFilter}
        />
      )}
    </div>
  );
};
