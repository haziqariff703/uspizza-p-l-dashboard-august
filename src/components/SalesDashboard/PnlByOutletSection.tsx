import React, { useState } from 'react';
import { OutletFinancialData } from '../../types';

interface PnlByOutletSectionProps {
  outlets: OutletFinancialData[];
}

export const PnlByOutletSection: React.FC<PnlByOutletSectionProps> = ({ outlets }) => {
  const activeOutlets = outlets.filter(o => o.status === 'active');
  const [selectedOutletId, setSelectedOutletId] = useState<string>('MY-030'); // Dpulze Cyberjaya

  const selectedOutlet = activeOutlets.find(o => o.id === selectedOutletId) || activeOutlets[0];

  // Ranked by Gross Profit descending
  const rankedOutlets = [...activeOutlets].sort((a, b) => b.grossProfit - a.grossProfit);

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
      {/* Header & Outlet Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            7
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              P&L by Outlet
            </h2>
            <p className="text-xs text-slate-500">
              Net sales – purchases = gross profit, per outlet
            </p>
          </div>
        </div>

        {/* Choose Outlet Dropdown */}
        <div className="w-full md:w-72">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            CHOOSE AN OUTLET
          </label>
          <select
            value={selectedOutletId}
            onChange={(e) => setSelectedOutletId(e.target.value)}
            className="w-full px-3 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-rose-500"
          >
            {activeOutlets.map(o => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Detail Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Selected Outlet Card (takes 2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {selectedOutlet.name}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {selectedOutlet.code} · {selectedOutlet.entity} SDN BHD
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                GROSS MARGIN
              </span>
              <span className="text-2xl font-extrabold text-emerald-600">
                {selectedOutlet.grossMargin}%
              </span>
            </div>
          </div>

          {/* Net sales by platform progress bars */}
          <div className="space-y-2 pt-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              NET SALES BY PLATFORM
            </div>

            {/* Grab */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Grab
                </span>
                <span className="font-bold text-slate-900">
                  RM {selectedOutlet.platformNet.Grab.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full" 
                  style={{ width: `${Math.round((selectedOutlet.platformNet.Grab / selectedOutlet.netSales) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* FoodPanda */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-pink-500"></span> FoodPanda
                </span>
                <span className="font-bold text-slate-900">
                  RM {selectedOutlet.platformNet.FoodPanda.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-pink-500 h-full rounded-full" 
                  style={{ width: `${Math.round((selectedOutlet.platformNet.FoodPanda / selectedOutlet.netSales) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Shopee */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> Shopee
                </span>
                <span className="font-bold text-slate-900">
                  RM {selectedOutlet.platformNet.Shopee.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-orange-500 h-full rounded-full" 
                  style={{ width: `${Math.round((selectedOutlet.platformNet.Shopee / selectedOutlet.netSales) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Apps */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Apps
                </span>
                <span className="font-bold text-slate-900">
                  RM {selectedOutlet.platformNet.Apps.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full" 
                  style={{ width: `${Math.round((selectedOutlet.platformNet.Apps / selectedOutlet.netSales) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* POS */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-slate-700">
                  <span className="w-2 h-2 rounded-full bg-slate-600"></span> POS
                </span>
                <span className="font-bold text-slate-900">
                  RM {selectedOutlet.platformNet.POS.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-slate-600 h-full rounded-full" 
                  style={{ width: `${Math.round((selectedOutlet.platformNet.POS / selectedOutlet.netSales) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Gross Sales (menu price)</span>
              <span className="font-semibold text-slate-900">RM {selectedOutlet.grossSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Less: discount</span>
              <span className="text-rose-600">– RM {selectedOutlet.discount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-900">
              <span>Net Sales (revenue)</span>
              <span>RM {selectedOutlet.netSales.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Less: Purchases (GRN)</span>
              <span className="text-rose-600">– RM {selectedOutlet.purchases.toLocaleString()}</span>
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-sm text-emerald-700">
              <span>Gross Profit</span>
              <span>RM {selectedOutlet.grossProfit.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Selected Scope Combined Card */}
        <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              SELECTED SCOPE · COMBINED
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">Net Sales</span>
                <span className="font-extrabold text-slate-900 text-sm">RM 3,503,594</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Purchases</span>
                <span className="font-semibold text-rose-600">– RM 1,390,892</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 mt-4">
            <div className="text-[10px] font-bold uppercase text-slate-400">Gross Profit</div>
            <div className="text-xl font-extrabold text-emerald-600 mt-0.5">
              RM 2,112,702 · 60.3%
            </div>
          </div>
        </div>

      </div>

      {/* P&L Ranking Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">OUTLET</th>
              <th className="py-3 px-4 text-right">NET SALES</th>
              <th className="py-3 px-4 text-right">PURCHASES</th>
              <th className="py-3 px-4 text-right font-extrabold text-slate-900">GROSS PROFIT ▼</th>
              <th className="py-3 px-4 text-right">MARGIN</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {rankedOutlets.map((outlet, idx) => {
              const isSelected = outlet.id === selectedOutlet.id;

              return (
                <tr
                  key={outlet.id}
                  onClick={() => setSelectedOutletId(outlet.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected ? 'bg-rose-50/50' : 'hover:bg-slate-50/70'
                  }`}
                >
                  <td className="py-3 px-4 font-mono text-slate-400 font-semibold">{idx + 1}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{outlet.name}</td>
                  <td className="py-3 px-4 text-right text-slate-700">RM {outlet.netSales.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right text-slate-700">RM {outlet.purchases.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                    RM {outlet.grossProfit.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-emerald-600">
                    {outlet.grossMargin}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
