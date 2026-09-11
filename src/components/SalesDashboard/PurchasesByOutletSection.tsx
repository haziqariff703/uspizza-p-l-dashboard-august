import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OutletFinancialData } from '../../types';

interface PurchasesByOutletSectionProps {
  outlets: OutletFinancialData[];
}

export const PurchasesByOutletSection: React.FC<PurchasesByOutletSectionProps> = ({ outlets }) => {
  const [hoveredPurchaseOutlet, setHoveredPurchaseOutlet] = useState<OutletFinancialData | null>(null);
  const [hoveredGrossOutlet, setHoveredGrossOutlet] = useState<OutletFinancialData | null>(null);

  const purchasesScrollRef = useRef<HTMLDivElement>(null);
  const grossScrollRef = useRef<HTMLDivElement>(null);

  const activeOutlets = outlets.filter(o => o.status === 'active');

  // Sorted by purchases high -> low
  const sortedByPurchases = [...activeOutlets].sort((a, b) => b.purchases - a.purchases);

  // Sorted by gross sales high -> low
  const sortedByGross = [...activeOutlets].sort((a, b) => b.grossSales - a.grossSales);

  const maxPurchases = 80000;
  const maxGross = 220000;

  return (
    <div className="space-y-6">
      {/* SECTION 5: Purchases by Outlet */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            5
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Purchases by Outlet
            </h2>
            <p className="text-xs text-slate-500">
              Goods received (GRN) per outlet
            </p>
          </div>
        </div>

        {/* Chart Container */}
        <div className="relative border border-slate-200 rounded-xl p-4 bg-slate-50/40">
          
          {/* Reference Lines */}
          <div className="absolute left-4 right-4 top-10 pointer-events-none border-b border-dashed border-slate-300">
            <span className="text-[10px] text-slate-400 font-semibold absolute -top-4 left-0">RM 80k</span>
          </div>
          <div className="absolute left-4 right-4 top-24 pointer-events-none border-b border-dashed border-slate-200">
            <span className="text-[10px] text-slate-400 font-semibold absolute -top-4 left-0">RM 60k</span>
          </div>
          <div className="absolute left-4 right-4 top-38 pointer-events-none border-b border-dashed border-slate-200">
            <span className="text-[10px] text-slate-400 font-semibold absolute -top-4 left-0">RM 40k</span>
          </div>
          <div className="absolute left-4 right-4 top-52 pointer-events-none border-b border-dashed border-slate-200">
            <span className="text-[10px] text-slate-400 font-semibold absolute -top-4 left-0">RM 20k</span>
          </div>

          <div 
            ref={purchasesScrollRef}
            className="overflow-x-auto pt-8 pb-16 scrollbar-none relative"
          >
            <div className="flex items-end gap-3 min-w-max h-56 pl-12 pr-6">
              {sortedByPurchases.map(outlet => {
                const heightPct = Math.min(Math.round((outlet.purchases / maxPurchases) * 100), 96);
                const isHovered = hoveredPurchaseOutlet?.id === outlet.id;

                return (
                  <div
                    key={outlet.id}
                    className="flex flex-col items-center group cursor-pointer relative"
                    onMouseEnter={() => setHoveredPurchaseOutlet(outlet)}
                    onMouseLeave={() => setHoveredPurchaseOutlet(null)}
                  >
                    {/* Top value badge */}
                    <span className="text-[10px] font-bold text-slate-500 mb-1">
                      {Math.round(outlet.purchases / 1000)}k
                    </span>

                    {/* Blue bar */}
                    <div
                      className={`w-7 sm:w-8 bg-sky-500 rounded-t-sm transition-all duration-200 ${
                        isHovered ? 'ring-2 ring-slate-900 ring-offset-1 brightness-110' : 'group-hover:bg-sky-600'
                      }`}
                      style={{ height: `${heightPct * 1.8}px` }}
                    ></div>

                    {/* Rotated label */}
                    <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-28 text-[11px] font-bold text-slate-600 whitespace-nowrap -rotate-45 origin-top-left pointer-events-none group-hover:text-rose-600">
                      {outlet.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hover Tooltip */}
          {hoveredPurchaseOutlet && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 bg-white p-3 rounded-xl shadow-xl border border-slate-200 text-xs w-56 animate-in fade-in pointer-events-none">
              <div className="font-bold text-slate-900 mb-1">
                {hoveredPurchaseOutlet.name}
              </div>
              <div className="flex items-baseline justify-between text-sky-600 font-extrabold text-sm">
                <span>RM {hoveredPurchaseOutlet.purchases.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-semibold">received</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => purchasesScrollRef.current?.scrollBy({ left: -250, behavior: 'smooth' })}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <span className="text-[11px] text-slate-500 font-semibold">
              ← scroll horizontally to see all 44 outlets →
            </span>
            <button
              onClick={() => purchasesScrollRef.current?.scrollBy({ left: 250, behavior: 'smooth' })}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 6: Gross Sales by Outlet */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
            6
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Gross Sales by Outlet
            </h2>
            <p className="text-xs text-slate-500">
              Menu selling price (before discount) per outlet
            </p>
          </div>
        </div>

        {/* Chart Container */}
        <div className="relative border border-slate-200 rounded-xl p-4 bg-slate-50/40">
          {/* Reference Lines */}
          <div className="absolute left-4 right-4 top-10 pointer-events-none border-b border-dashed border-slate-300">
            <span className="text-[10px] text-slate-400 font-semibold absolute -top-4 left-0">RM 220k</span>
          </div>
          <div className="absolute left-4 right-4 top-24 pointer-events-none border-b border-dashed border-slate-200">
            <span className="text-[10px] text-slate-400 font-semibold absolute -top-4 left-0">RM 165k</span>
          </div>
          <div className="absolute left-4 right-4 top-38 pointer-events-none border-b border-dashed border-slate-200">
            <span className="text-[10px] text-slate-400 font-semibold absolute -top-4 left-0">RM 110k</span>
          </div>
          <div className="absolute left-4 right-4 top-52 pointer-events-none border-b border-dashed border-slate-200">
            <span className="text-[10px] text-slate-400 font-semibold absolute -top-4 left-0">RM 55k</span>
          </div>

          <div 
            ref={grossScrollRef}
            className="overflow-x-auto pt-8 pb-16 scrollbar-none relative"
          >
            <div className="flex items-end gap-3 min-w-max h-56 pl-12 pr-6">
              {sortedByGross.map(outlet => {
                const heightPct = Math.min(Math.round((outlet.grossSales / maxGross) * 100), 96);
                const isHovered = hoveredGrossOutlet?.id === outlet.id;

                return (
                  <div
                    key={outlet.id}
                    className="flex flex-col items-center group cursor-pointer relative"
                    onMouseEnter={() => setHoveredGrossOutlet(outlet)}
                    onMouseLeave={() => setHoveredGrossOutlet(null)}
                  >
                    {/* Top value badge */}
                    <span className="text-[10px] font-bold text-slate-500 mb-1">
                      {Math.round(outlet.grossSales / 1000)}k
                    </span>

                    {/* Purple bar */}
                    <div
                      className={`w-7 sm:w-8 bg-indigo-500 rounded-t-sm transition-all duration-200 ${
                        isHovered ? 'ring-2 ring-slate-900 ring-offset-1 brightness-110' : 'group-hover:bg-indigo-600'
                      }`}
                      style={{ height: `${heightPct * 1.8}px` }}
                    ></div>

                    {/* Rotated label */}
                    <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-28 text-[11px] font-bold text-slate-600 whitespace-nowrap -rotate-45 origin-top-left pointer-events-none group-hover:text-rose-600">
                      {outlet.name}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hover Tooltip */}
          {hoveredGrossOutlet && (
            <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 bg-white p-3 rounded-xl shadow-xl border border-slate-200 text-xs w-56 animate-in fade-in pointer-events-none">
              <div className="font-bold text-slate-900 mb-1">
                {hoveredGrossOutlet.name}
              </div>
              <div className="flex items-baseline justify-between text-indigo-700 font-extrabold text-sm">
                <span>RM {hoveredGrossOutlet.grossSales.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 font-semibold">menu price</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => grossScrollRef.current?.scrollBy({ left: -250, behavior: 'smooth' })}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
            </button>
            <span className="text-[11px] text-slate-500 font-semibold">
              ← scroll horizontally to see all 44 outlets →
            </span>
            <button
              onClick={() => grossScrollRef.current?.scrollBy({ left: 250, behavior: 'smooth' })}
              className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
