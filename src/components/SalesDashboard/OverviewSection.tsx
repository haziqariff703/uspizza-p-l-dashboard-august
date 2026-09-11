import React from 'react';
import { ENTITY_TOTALS, PLATFORM_SETTLEMENTS } from '../../data/outletData';

interface OverviewSectionProps {
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ entityFilter }) => {
  const totals = ENTITY_TOTALS[entityFilter];

  return (
    <div className="space-y-6">
      {/* 1. Overview Header */}
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
          1
        </span>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Overview
          </h2>
          <p className="text-xs text-slate-500">
            Sales by metric · all 46 corporate outlets · May 2026
          </p>
        </div>
      </div>

      {/* Entity Net Sales Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* MY US PIZZA SDN BHD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            MY US PIZZA SDN BHD
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              RM 3,362,683
            </span>
            <span className="text-xs font-semibold text-slate-500">
              42 outlets · net sales
            </span>
          </div>
        </div>

        {/* MY US PIZZA (SABAH) SDN BHD */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            MY US PIZZA (SABAH) SDN BHD
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              RM 140,912
            </span>
            <span className="text-xs font-semibold text-slate-500">
              2 outlets · net sales
            </span>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards with colored top bars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* GROSS SALES (purple bar) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500"></div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-1">
            GROSS SALES
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            RM {totals.grossSales.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Menu selling price
          </div>
        </div>

        {/* NET SALES (rose bar) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-rose-600"></div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-1">
            NET SALES
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            RM {totals.netSales.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Menu price – discount
          </div>
        </div>

        {/* NET + SERVICE CHARGE (blue bar) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500"></div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-1">
            NET + SERVICE CHARGE
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            RM 3,540,623
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            + 10% service charge (dine-in)
          </div>
        </div>

        {/* NET + SC + TAX (emerald bar) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-teal-600"></div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mt-1">
            NET + SC + TAX
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            RM 3,753,327
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            + 6% SST
          </div>
        </div>
      </div>

      {/* Formula Strip matching screenshot */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs overflow-x-auto text-xs font-semibold text-slate-700 whitespace-nowrap">
        <span className="font-bold text-slate-900">RM 4,656,312</span> <span className="text-slate-500">gross</span>
        <span className="text-rose-600 mx-2">– RM 1,152,718 discount</span>
        <span className="text-slate-400 mx-1">=</span>
        <span className="font-bold text-slate-900 mx-1">RM 3,503,594</span> <span className="text-slate-500">net</span>
        <span className="text-sky-600 mx-2">+ RM 37,029 SC</span>
        <span className="text-teal-600 mx-2">+ RM 212,704 SST</span>
        <span className="text-slate-400 mx-1">=</span>
        <span className="font-bold text-slate-900 ml-2">RM 3,753,327</span> <span className="text-slate-500">collected</span>
      </div>

      {/* Bottom Row of 4 Cards: PURCHASES, PROFIT, MARGIN, COMMISSION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL PURCHASES */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            TOTAL PURCHASES
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            RM {totals.purchases.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            GRN received
          </div>
        </div>

        {/* GROSS PROFIT */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            GROSS PROFIT
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
            RM {totals.grossProfit.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Net – Purchases
          </div>
        </div>

        {/* GROSS MARGIN */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            GROSS MARGIN
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">
            {totals.grossMargin}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            of net sales
          </div>
        </div>

        {/* NET AFTER COMMISSION */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            NET AFTER COMMISSION
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
            RM 3,112,006
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            less RM 391,588 comm.
          </div>
        </div>
      </div>

      {/* NET SETTLEMENT BY PLATFORM (Screenshot 2) */}
      <div className="pt-4">
        <div className="mb-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-700">
            NET SETTLEMENT BY PLATFORM
          </h3>
          <p className="text-xs text-slate-500">
            What actually reaches the bank, and how each figure derives from gross sales.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PLATFORM_SETTLEMENTS.map(plat => (
            <div 
              key={plat.platform}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden"
            >
              {/* Top Accent bar */}
              <div 
                className="absolute top-0 left-0 right-0 h-1" 
                style={{ backgroundColor: plat.color }}
              ></div>

              {/* Platform name & Kept % */}
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: plat.color }}
                  ></span>
                  <span className="font-bold text-slate-900 text-sm">
                    {plat.platform}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {plat.keptPct}% kept
                </span>
              </div>

              {/* Net Settlement Large */}
              <div className="mt-2 mb-3">
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  RM {plat.netSettlement.toLocaleString()}
                </div>
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  NET SETTLEMENT
                </div>
              </div>

              {/* Itemized Calculation Breakdown */}
              <div className="border-t border-slate-100 pt-2.5 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Gross sales</span>
                  <span className="font-semibold text-slate-900">RM {plat.grossSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>– Discount</span>
                  <span>RM {plat.discount.toLocaleString()}</span>
                </div>
                {plat.serviceCharge > 0 && (
                  <div className="flex justify-between text-sky-600">
                    <span>+ Service charge</span>
                    <span>RM {plat.serviceCharge.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-teal-600">
                  <span>+ Tax (SST)</span>
                  <span>RM {plat.taxSst.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-amber-700">
                  <span>– Commission & fees</span>
                  <span>RM {plat.commissionFees.toLocaleString()}</span>
                </div>

                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-900 text-xs">
                  <span>= Net settlement</span>
                  <span>RM {plat.netSettlement.toLocaleString()}</span>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
