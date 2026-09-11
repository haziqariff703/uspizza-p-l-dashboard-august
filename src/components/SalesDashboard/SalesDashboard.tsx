import React from 'react';
import { OverviewSection } from './OverviewSection';
import { CommissionFeesSection } from './CommissionFeesSection';
import { DataCoverageSection } from './DataCoverageSection';
import { SalesByOutletSection } from './SalesByOutletSection';
import { PurchasesByOutletSection } from './PurchasesByOutletSection';
import { PnlByOutletSection } from './PnlByOutletSection';
import { OutletFinancialData } from '../../types';

interface SalesDashboardProps {
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
  outlets: OutletFinancialData[];
  onGoToTasks: () => void;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({
  entityFilter,
  outlets,
  onGoToTasks,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Dashboard Sub-header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-rose-600">
            US PIZZA · CORPORATE OUTLETS
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Sales & Purchases Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Period: May 2026 (44 outlets · 2 entities) · All financial figures verified against merchant ledgers
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            Books Locked: May 31
          </span>
        </div>
      </div>

      {/* Section 1: Overview & Net Settlement by Platform */}
      <section id="section-overview">
        <OverviewSection entityFilter={entityFilter} />
      </section>

      {/* Section 2: Commission & Fees Breakdown */}
      <section id="section-fees">
        <CommissionFeesSection />
      </section>

      {/* Section 3: Data Coverage */}
      <section id="section-coverage">
        <DataCoverageSection onGoToTasks={onGoToTasks} />
      </section>

      {/* Section 4: Sales by Outlet */}
      <section id="section-sales">
        <SalesByOutletSection outlets={outlets} />
      </section>

      {/* Section 5 & 6: Purchases by Outlet and Gross Sales by Outlet */}
      <section id="section-purchases">
        <PurchasesByOutletSection outlets={outlets} />
      </section>

      {/* Section 7: P&L by Outlet */}
      <section id="section-pnl">
        <PnlByOutletSection outlets={outlets} />
      </section>
    </div>
  );
};
