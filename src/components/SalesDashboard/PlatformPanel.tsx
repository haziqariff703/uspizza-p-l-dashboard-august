import React from 'react';
import { PLATFORM_SETTLEMENTS } from '../../data/outletData';
import { ChannelFilter } from '../../types';
import { PLATFORM_BRAND } from '../../platformColors';

interface PlatformPanelProps {
  /** Channel picked in the navbar; 'All' shows every platform. */
  channelFilter: ChannelFilter;
}

const money = (value: number) => `RM ${Math.abs(value).toLocaleString()}`;

/**
 * Net settlement per platform, showing how each figure derives from gross
 * sales — the original capture's "Net Settlement by Platform" block.
 */
export const PlatformPanel: React.FC<PlatformPanelProps> = ({ channelFilter }) => {
  const settlements = PLATFORM_SETTLEMENTS.filter(
    (item) => channelFilter === 'All' || item.platform === channelFilter
  );

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Net Settlement by Platform</h3>
        <p className="text-xs text-slate-400">
          What actually reaches the bank, and how each figure derives from gross sales.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {settlements.map((item) => {
          const brand = PLATFORM_BRAND[item.platform] ?? '#64748B';
          const lines = [
            { label: 'Gross sales', value: item.grossSales, color: '#64748B' },
            { label: '− Discount', value: item.discount, color: '#E11D48' },
            ...(item.serviceCharge > 0
              ? [{ label: '+ Service charge', value: item.serviceCharge, color: '#0EA5E9' }]
              : []),
            { label: '+ Tax (SST)', value: item.taxSst, color: '#0D9488' },
            { label: '− Commission & fees', value: item.commissionFees, color: '#D97706' },
          ];

          return (
            <article
              key={item.platform}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: brand }} aria-hidden="true" />

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: brand }} aria-hidden="true" />
                  <span className="text-sm font-semibold text-slate-700">{item.platform}</span>
                </span>
                <span className="text-[10px] font-medium text-slate-400">{item.keptPct}% kept</span>
              </div>

              <div className="mt-1.5 text-xl font-extrabold tabular-nums text-slate-900">
                {money(item.netSettlement)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">net settlement</div>

              <dl className="mt-2.5 space-y-1 border-t border-slate-100 pt-2 text-[11px] tabular-nums">
                {lines.map((line) => (
                  <div key={line.label} className="flex items-center justify-between gap-2">
                    <dt style={{ color: line.color }}>{line.label}</dt>
                    <dd className="text-slate-700">{money(line.value)}</dd>
                  </div>
                ))}
                <div className="mt-1 flex items-center justify-between gap-2 border-t border-slate-100 pt-1 font-bold text-slate-900">
                  <dt>= Net settlement</dt>
                  <dd>{money(item.netSettlement)}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
};
