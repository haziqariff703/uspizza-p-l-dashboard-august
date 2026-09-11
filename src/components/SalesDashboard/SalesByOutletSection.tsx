import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OutletFinancialData } from '../../types';

interface SalesByOutletSectionProps {
  outlets: OutletFinancialData[];
}

export const SalesByOutletSection: React.FC<SalesByOutletSectionProps> = ({ outlets }) => {
  const [metric, setMetric] = useState<'gross' | 'net' | 'netSc' | 'netScTax'>('gross');
  const [viewMode, setViewMode] = useState<'total' | 'platform'>('platform');
  const [hoveredOutlet, setHoveredOutlet] = useState<OutletFinancialData | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const tradingOutlets = outlets.filter(o => o.status === 'active');

  // Sort outlets high -> low based on chosen metric
  const sortedOutlets = [...tradingOutlets].sort((a, b) => {
    let valA = a.grossSales;
    let valB = b.grossSales;
    if (metric === 'net') {
      valA = a.netSales;
      valB = b.netSales;
    } else if (metric === 'netSc') {
      valA = a.netSales + a.serviceCharge;
      valB = b.netSales + b.serviceCharge;
    } else if (metric === 'netScTax') {
      valA = a.netSales + a.serviceCharge + a.taxSst;
      valB = b.netSales + b.serviceCharge + b.taxSst;
    }
    return valB - valA;
  });

  const getMetricTitle = () => {
    switch (metric) {
      case 'gross': return 'Gross Sales per HQ outlet · Menu selling price · sorted high → low';
      case 'net': return 'Net Sales per HQ outlet · Menu price – discount · sorted high → low';
      case 'netSc': return 'Net + Service Charge per HQ outlet · + 10% service charge (dine-in) · sorted high → low';
      case 'netScTax': return 'Net + SC + Tax per HQ outlet · + 6% SST · sorted high → low';
    }
  };

  const maxVal = Math.max(...sortedOutlets.map(o => {
    if (metric === 'gross') return o.grossSales;
    if (metric === 'net') return o.netSales;
    if (metric === 'netSc') return o.netSales + o.serviceCharge;
    return o.netSales + o.serviceCharge + o.taxSst;
  }), 220000);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 relative">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
          4
        </span>
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
            Sales by Outlet
          </h2>
          <p className="text-xs text-slate-500">
            Pick a metric and toggle the platform-stacked view
          </p>
        </div>
      </div>

      {/* Metric Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 overflow-x-auto text-xs font-bold scrollbar-none">
        <button
          onClick={() => setMetric('gross')}
          className={`px-4 py-1.5 rounded-lg transition-all ${
            metric === 'gross' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Gross
        </button>
        <button
          onClick={() => setMetric('net')}
          className={`px-4 py-1.5 rounded-lg transition-all ${
            metric === 'net' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Net
        </button>
        <button
          onClick={() => setMetric('netSc')}
          className={`px-4 py-1.5 rounded-lg transition-all ${
            metric === 'netSc' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Net + SC
        </button>
        <button
          onClick={() => setMetric('netScTax')}
          className={`px-4 py-1.5 rounded-lg transition-all ${
            metric === 'netScTax' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Net + SC + SST
        </button>
      </div>

      {/* View Toggle: Total vs By platform */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit text-xs font-bold">
        <button
          onClick={() => setViewMode('total')}
          className={`px-3 py-1 rounded-lg transition-all ${
            viewMode === 'total' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Total
        </button>
        <button
          onClick={() => setViewMode('platform')}
          className={`px-3 py-1 rounded-lg transition-all ${
            viewMode === 'platform' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          By platform
        </button>
      </div>

      {/* Subtitle */}
      <div className="text-xs font-bold text-slate-700">
        {getMetricTitle()}
      </div>

      {/* Horizontal Stacked Bar Chart Area */}
      <div className="relative border border-slate-200 rounded-xl p-4 bg-slate-50/40">
        
        {/* Y Axis Reference lines */}
        <div className="absolute left-4 right-4 top-10 pointer-events-none border-b border-dashed border-slate-300">
          <span className="text-[10px] text-slate-400 font-semibold absolute -top-4 left-0">
            {metric === 'gross' ? 'RM 220k' : metric === 'net' ? 'RM 160k' : 'RM 180k'}
          </span>
        </div>
        <div className="absolute left-4 right-4 top-28 pointer-events-none border-b border-dashed border-slate-200">
          <span className="text-[10px] text-slate-400 font-semibold absolute -top-4 left-0">
            {metric === 'gross' ? 'RM 165k' : metric === 'net' ? 'RM 120k' : 'RM 135k'}
          </span>
        </div>
        <div className="absolute left-4 right-4 top-44 pointer-events-none border-b border-dashed border-slate-200">
          <span className="text-[10px] text-slate-400 font-semibold absolute -top-4 left-0">
            {metric === 'gross' ? 'RM 110k' : metric === 'net' ? 'RM 80k' : 'RM 90k'}
          </span>
        </div>
        <div className="absolute left-4 right-4 top-60 pointer-events-none border-b border-dashed border-slate-200">
          <span className="text-[10px] text-slate-400 font-semibold absolute -top-4 left-0">
            {metric === 'gross' ? 'RM 55k' : metric === 'net' ? 'RM 40k' : 'RM 45k'}
          </span>
        </div>

        {/* Scrollable Container */}
        <div 
          ref={scrollContainerRef}
          className="overflow-x-auto pt-8 pb-16 scrollbar-none relative"
        >
          <div className="flex items-end gap-3 min-w-max h-64 pl-12 pr-6">
            {sortedOutlets.map(outlet => {
              let displayVal = outlet.grossSales;
              if (metric === 'net') displayVal = outlet.netSales;
              if (metric === 'netSc') displayVal = outlet.netSales + outlet.serviceCharge;
              if (metric === 'netScTax') displayVal = outlet.netSales + outlet.serviceCharge + outlet.taxSst;

              const heightPct = Math.min(Math.round((displayVal / maxVal) * 100), 98);

              // Platform proportions
              const netMap = metric === 'gross' ? outlet.platformGross : outlet.platformNet;
              const grabH = Math.round(((netMap.Grab || 0) / (displayVal || 1)) * 100);
              const fpH = Math.round(((netMap.FoodPanda || 0) / (displayVal || 1)) * 100);
              const shopeeH = Math.round(((netMap.Shopee || 0) / (displayVal || 1)) * 100);
              const appsH = Math.round(((netMap.Apps || 0) / (displayVal || 1)) * 100);
              const posH = 100 - (grabH + fpH + shopeeH + appsH);

              const isHovered = hoveredOutlet?.id === outlet.id;

              return (
                <div
                  key={outlet.id}
                  className="flex flex-col items-center group cursor-pointer relative"
                  onMouseEnter={() => setHoveredOutlet(outlet)}
                  onMouseLeave={() => setHoveredOutlet(null)}
                >
                  {/* The Bar */}
                  <div 
                    className={`w-7 sm:w-8 rounded-t-sm flex flex-col justify-end overflow-hidden transition-all duration-200 ${
                      isHovered ? 'ring-2 ring-slate-900 ring-offset-1 brightness-110' : ''
                    }`}
                    style={{ height: `${heightPct * 2.2}px` }}
                  >
                    {viewMode === 'total' ? (
                      <div className="w-full h-full bg-indigo-600 rounded-t-sm"></div>
                    ) : (
                      <>
                        {/* POS (slate top) */}
                        <div style={{ height: `${Math.max(posH, 6)}%` }} className="bg-slate-600" title="POS"></div>
                        {/* Apps (indigo) */}
                        <div style={{ height: `${Math.max(appsH, 5)}%` }} className="bg-indigo-500" title="Apps"></div>
                        {/* Shopee (orange) */}
                        <div style={{ height: `${Math.max(shopeeH, 12)}%` }} className="bg-orange-500" title="Shopee"></div>
                        {/* FoodPanda (pink) */}
                        <div style={{ height: `${Math.max(fpH, 12)}%` }} className="bg-pink-500" title="FoodPanda"></div>
                        {/* Grab (green bottom) */}
                        <div style={{ height: `${Math.max(grabH, 20)}%` }} className="bg-emerald-500" title="Grab"></div>
                      </>
                    )}
                  </div>

                  {/* Outlet Label (rotated 45deg) */}
                  <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 w-28 text-[11px] font-bold text-slate-600 whitespace-nowrap -rotate-45 origin-top-left pointer-events-none group-hover:text-rose-600">
                    {outlet.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hover Tooltip Overlay (matching screenshots tooltip) */}
        {hoveredOutlet && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20 bg-white p-3.5 rounded-xl shadow-xl border border-slate-200 text-xs w-64 animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
            <div className="font-extrabold text-slate-900 text-sm border-b pb-1.5 mb-2">
              {hoveredOutlet.name}
            </div>
            <div className="space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-600"></span> POS
                </span>
                <span className="font-semibold text-slate-900">
                  RM {(metric === 'gross' ? hoveredOutlet.platformGross.POS : hoveredOutlet.platformNet.POS).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Apps
                </span>
                <span className="font-semibold text-slate-900">
                  RM {(metric === 'gross' ? hoveredOutlet.platformGross.Apps : hoveredOutlet.platformNet.Apps).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-orange-500"></span> Shopee
                </span>
                <span className="font-semibold text-slate-900">
                  RM {(metric === 'gross' ? hoveredOutlet.platformGross.Shopee : hoveredOutlet.platformNet.Shopee).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-pink-500"></span> FoodPanda
                </span>
                <span className="font-semibold text-slate-900">
                  RM {(metric === 'gross' ? hoveredOutlet.platformGross.FoodPanda : hoveredOutlet.platformNet.FoodPanda).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Grab
                </span>
                <span className="font-semibold text-slate-900">
                  RM {(metric === 'gross' ? hoveredOutlet.platformGross.Grab : hoveredOutlet.platformNet.Grab).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200 mt-2 pt-1.5 flex justify-between font-extrabold text-slate-900 text-xs">
              <span>{metric === 'gross' ? 'Gross Sales' : metric === 'net' ? 'Net Sales' : 'Net + SC + Tax'}</span>
              <span>
                RM {(metric === 'gross' ? hoveredOutlet.grossSales : metric === 'net' ? hoveredOutlet.netSales : hoveredOutlet.netSales + hoveredOutlet.serviceCharge + hoveredOutlet.taxSst).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Scroll Bar Controls */}
        <div className="mt-8 pt-3 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleScrollLeft}
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-500 font-semibold">
            ← scroll horizontally to see all 44 outlets →
          </span>
          <button
            onClick={handleScrollRight}
            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
