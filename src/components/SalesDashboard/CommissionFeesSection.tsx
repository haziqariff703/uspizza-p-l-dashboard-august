import React, { useState } from 'react';
import { COMMISSION_FEES_SUMMARY } from '../../data/outletData';

export const CommissionFeesSection: React.FC = () => {
  const [selectedPlatformTab, setSelectedPlatformTab] = useState<'All' | 'Grab' | 'FoodPanda' | 'Shopee' | 'Apps'>('All');
  const data = COMMISSION_FEES_SUMMARY;

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
          2
        </span>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Commission & Fees Breakdown
          </h2>
          <p className="text-xs text-slate-500">
            What each platform charges you per month — switch platforms to drill into per-outlet fees
          </p>
        </div>
      </div>

      {/* Top 3 Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Advertising Spend */}
        <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40">
          <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
            ADVERTISING SPEND / MONTH
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 mt-1">
            RM {data.advertisingSpend.toLocaleString()}
          </div>
          <div className="text-xs text-indigo-900 mt-1">
            {data.advertisingBreakdown}
          </div>
        </div>

        {/* Card 2: Commission / Month */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            COMMISSION / MONTH
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">
            RM {data.commissionMonth.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            ≈ {data.commissionRateNet}% of net · {data.commissionBreakdown}
          </div>
        </div>

        {/* Card 3: Total Fees */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            TOTAL FEES / MONTH
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            RM {data.totalFeesMonth.toLocaleString()}
          </div>
          <div className="text-xs text-amber-900 mt-1">
            {data.totalFeesGrossPct}% of gross sales
          </div>
        </div>
      </div>

      {/* Platform Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(['All', 'Grab', 'FoodPanda', 'Shopee', 'Apps'] as const).map(p => (
          <button
            key={p}
            onClick={() => setSelectedPlatformTab(p)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              selectedPlatformTab === p
                ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
            }`}
          >
            {p === 'Grab' && <span className="w-2 h-2 rounded-full bg-emerald-500"></span>}
            {p === 'FoodPanda' && <span className="w-2 h-2 rounded-full bg-pink-500"></span>}
            {p === 'Shopee' && <span className="w-2 h-2 rounded-full bg-orange-500"></span>}
            {p === 'Apps' && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
            <span>{p === 'All' ? 'All platforms' : p}</span>
          </button>
        ))}
      </div>

      {/* Fee Breakdown Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">FEE TYPE</th>
              <th className="py-3 px-3 text-right">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> GRAB
                </span>
              </th>
              <th className="py-3 px-3 text-right">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-pink-500"></span> FOODPANDA
                </span>
              </th>
              <th className="py-3 px-3 text-right">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> SHOPEE
                </span>
              </th>
              <th className="py-3 px-3 text-right">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> APPS
                </span>
              </th>
              <th className="py-3 px-4 text-right font-extrabold">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {/* Commission */}
            <tr>
              <td className="py-3 px-4 font-bold text-slate-900">Commission</td>
              <td className="py-3 px-3 text-right text-slate-800">RM 387,504</td>
              <td className="py-3 px-3 text-right text-slate-800">RM 110,462</td>
              <td className="py-3 px-3 text-right text-slate-800">RM 137,056</td>
              <td className="py-3 px-3 text-right text-slate-400">—</td>
              <td className="py-3 px-4 text-right font-bold text-slate-900">RM 635,023</td>
            </tr>

            {/* actual commission rate */}
            <tr className="text-slate-400 italic text-[11px]">
              <td className="py-1 px-4 font-normal">↳ actual commission rate (of net sales)</td>
              <td className="py-1 px-3 text-right">29.8%</td>
              <td className="py-1 px-3 text-right">23.0%</td>
              <td className="py-1 px-3 text-right">21.2%</td>
              <td className="py-1 px-3 text-right">—</td>
              <td className="py-1 px-4 text-right font-semibold text-slate-600">23.4%</td>
            </tr>

            {/* Advertising */}
            <tr>
              <td className="py-3 px-4 font-bold text-indigo-700">Advertising</td>
              <td className="py-3 px-3 text-right text-slate-800">RM 98,435</td>
              <td className="py-3 px-3 text-right text-slate-800">RM 54,838</td>
              <td className="py-3 px-3 text-right text-slate-400">—</td>
              <td className="py-3 px-3 text-right text-slate-400">—</td>
              <td className="py-3 px-4 text-right font-bold text-indigo-700">RM 153,273</td>
            </tr>

            {/* Platform / service fees */}
            <tr>
              <td className="py-3 px-4 text-slate-700">Platform / service fees</td>
              <td className="py-3 px-3 text-right text-slate-800">RM 19,146</td>
              <td className="py-3 px-3 text-right text-slate-800">RM 2,920</td>
              <td className="py-3 px-3 text-right text-slate-400">—</td>
              <td className="py-3 px-3 text-right text-slate-400">—</td>
              <td className="py-3 px-4 text-right font-bold text-slate-900">RM 22,066</td>
            </tr>

            {/* Payment gateway */}
            <tr>
              <td className="py-3 px-4 text-slate-700">Payment gateway</td>
              <td className="py-3 px-3 text-right text-slate-400">—</td>
              <td className="py-3 px-3 text-right text-slate-400">—</td>
              <td className="py-3 px-3 text-right text-slate-400">—</td>
              <td className="py-3 px-3 text-right text-slate-800">RM 4,178</td>
              <td className="py-3 px-4 text-right font-bold text-slate-900">RM 4,178</td>
            </tr>

            {/* Adjustments / credits */}
            <tr>
              <td className="py-3 px-4 text-slate-700">Adjustments / credits</td>
              <td className="py-3 px-3 text-right text-slate-800">RM 8,934</td>
              <td className="py-3 px-3 text-right text-emerald-600 font-bold">RM -27,693</td>
              <td className="py-3 px-3 text-right text-slate-800">RM 3,682</td>
              <td className="py-3 px-3 text-right text-slate-400">—</td>
              <td className="py-3 px-4 text-right font-bold text-slate-900">RM -15,077</td>
            </tr>

            {/* Total fees */}
            <tr className="bg-slate-50/80 font-bold text-slate-900 border-t border-slate-200">
              <td className="py-3 px-4 font-extrabold">Total fees</td>
              <td className="py-3 px-3 text-right font-extrabold">RM 514,019</td>
              <td className="py-3 px-3 text-right font-extrabold">RM 140,527</td>
              <td className="py-3 px-3 text-right font-extrabold">RM 140,738</td>
              <td className="py-3 px-3 text-right font-extrabold">RM 4,178</td>
              <td className="py-3 px-4 text-right font-extrabold text-amber-600">RM 799,463</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Segmented platform fee bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Grab bar */}
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span className="flex items-center gap-1 text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Grab
            </span>
            <span className="text-slate-900">RM 514,019 fees</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full flex overflow-hidden">
            <div style={{ width: '75%' }} className="bg-slate-900" title="Commission: 75%"></div>
            <div style={{ width: '19%' }} className="bg-indigo-600" title="Advertising: 19%"></div>
            <div style={{ width: '4%' }} className="bg-sky-500" title="Platform fees: 4%"></div>
            <div style={{ width: '2%' }} className="bg-emerald-500" title="Adjustments: 2%"></div>
          </div>
        </div>

        {/* FoodPanda bar */}
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span className="flex items-center gap-1 text-slate-800">
              <span className="w-2 h-2 rounded-full bg-pink-500"></span> FoodPanda
            </span>
            <span className="text-slate-900">RM 140,527 fees</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full flex overflow-hidden">
            <div style={{ width: '60%' }} className="bg-slate-900" title="Commission: 60%"></div>
            <div style={{ width: '30%' }} className="bg-indigo-600" title="Advertising: 30%"></div>
            <div style={{ width: '10%' }} className="bg-sky-500" title="Fees: 10%"></div>
          </div>
        </div>

        {/* Shopee bar */}
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span className="flex items-center gap-1 text-slate-800">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span> Shopee
            </span>
            <span className="text-slate-900">RM 140,738 fees</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full flex overflow-hidden">
            <div style={{ width: '95%' }} className="bg-slate-900" title="Commission: 95%"></div>
            <div style={{ width: '5%' }} className="bg-slate-400" title="Adjustments: 5%"></div>
          </div>
        </div>

        {/* Apps bar */}
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50">
          <div className="flex justify-between text-xs font-bold mb-1.5">
            <span className="flex items-center gap-1 text-slate-800">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Apps
            </span>
            <span className="text-slate-900">RM 4,178 fees</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full flex overflow-hidden">
            <div style={{ width: '100%' }} className="bg-teal-600" title="Payment gateway: 100%"></div>
          </div>
        </div>
      </div>

      {/* Legend & Explanatory footnote */}
      <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500">
        <div className="flex items-center flex-wrap gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-900"></span> Commission
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Advertising
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span> Platform / service fees
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal-600"></span> Payment gateway
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span> Adjustments / credits
          </span>
        </div>
      </div>

      <div className="text-[11px] text-slate-400 italic">
        From each platform's settlement report. Advertising = Grab ad charges + FoodPanda Display Ads & Premium Placement (CPC). Adjustments shown in <span className="text-emerald-600 font-bold">green</span> are credits/reimbursements.
      </div>
    </div>
  );
};
