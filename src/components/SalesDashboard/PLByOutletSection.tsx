import React, { useMemo, useState, useEffect } from 'react';
import { ENTITY_TOTALS, PL_BY_OUTLET, PLATFORM_DETAIL_BY_OUTLET } from '../../data/outletData';

const money = (value: number) => `RM ${Math.abs(value).toLocaleString()}`;

const PLATFORM_COLORS: Record<string, string> = {
  Grab: '#00B14F',
  FoodPanda: '#D70F64',
  Shopee: '#EE4D2D',
  Apps: '#6366F1', // real original color — see docs/original-capture.html
  POS: '#64748B',
};

const marginColor = (pct: number) => (pct >= 60 ? '#16a34a' : '#65a30d');

interface PLByOutletSectionProps {
  /** Outlet code to open on mount / when the navbar search jumps here. */
  selectedCode?: string | null;
  onSelectOutlet?: (code: string) => void;
}

export const PLByOutletSection: React.FC<PLByOutletSectionProps> = ({ selectedCode, onSelectOutlet }) => {
  const sortedByProfit = useMemo(() => [...PL_BY_OUTLET].sort((a, b) => b.grossProfit - a.grossProfit), []);
  const byCode = useMemo(() => new Map(PL_BY_OUTLET.map((o) => [o.code, o])), []);
  const byName = useMemo(() => [...PL_BY_OUTLET].sort((a, b) => a.name.localeCompare(b.name)), []);

  const [localCode, setLocalCode] = useState<string>(selectedCode || 'MY-030');

  // Follow an external jump (e.g. navbar search) without fighting local selection.
  useEffect(() => {
    if (selectedCode) setLocalCode(selectedCode);
  }, [selectedCode]);

  const outlet = byCode.get(localCode) || PL_BY_OUTLET[0];
  const platforms = PLATFORM_DETAIL_BY_OUTLET[outlet.name];
  const maxPlatform = platforms ? Math.max(...Object.values(platforms)) : 0;

  const handleSelect = (code: string) => {
    setLocalCode(code);
    onSelectOutlet?.(code);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-2xs">
          7
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">P&amp;L by Outlet</h2>
          <p className="text-xs text-slate-500">Net sales − purchases = gross profit, per outlet</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Selected-outlet detail card */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{outlet.name}</h3>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {outlet.code} · {outlet.entity === 'Sabah' ? 'MY US Pizza (Sabah) Sdn Bhd' : 'MY US Pizza Sdn Bhd'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-slate-400">Gross margin</div>
                <div className="text-2xl font-bold tabular-nums" style={{ color: marginColor(outlet.marginPct) }}>
                  {outlet.marginPct.toFixed(1)}%
                </div>
              </div>
            </div>

            {platforms ? (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Net sales by platform</div>
                {(Object.entries(platforms) as [string, number][]).map(([platform, value]) => (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="flex w-20 shrink-0 items-center gap-1.5 text-sm text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLATFORM_COLORS[platform] }} />
                      {platform}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(value / maxPlatform) * 100}%`, background: PLATFORM_COLORS[platform] }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums text-slate-700">
                      {money(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Per-platform split isn't pulled through for this outlet yet.</p>
            )}

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Net Sales (revenue)</span>
                <span className="font-semibold tabular-nums text-slate-900">{money(outlet.netSales)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Less: Purchases (GRN)</span>
                <span className="tabular-nums">− {money(outlet.purchases)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                <span className="font-bold text-slate-900">Gross Profit</span>
                <span className="font-bold tabular-nums" style={{ color: marginColor(outlet.marginPct) }}>
                  {money(outlet.grossProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Outlet picker + combined scope */}
        <div className="lg:col-span-2">
          <label htmlFor="pl-outlet-select" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Choose an outlet
          </label>
          <select
            id="pl-outlet-select"
            value={localCode}
            onChange={(e) => handleSelect(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800 shadow-2xs outline-none focus:border-slate-400"
          >
            {byName.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Selected scope · combined</div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Net Sales</span>
              <span className="font-semibold tabular-nums text-slate-900">{money(ENTITY_TOTALS.all.netSales)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-500">
              <span>Purchases</span>
              <span className="tabular-nums">− {money(ENTITY_TOTALS.all.purchases)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-900">Gross Profit</span>
              <span className="font-bold tabular-nums text-emerald-600">
                {money(ENTITY_TOTALS.all.grossProfit)} · {ENTITY_TOTALS.all.grossMargin}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Full ranked table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-slate-500">#</th>
              <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Outlet</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-500">Net Sales</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-500">Purchases</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-900">Gross Profit ▼</th>
              <th className="px-3 py-2.5 text-right font-semibold text-slate-500">Margin</th>
            </tr>
          </thead>
          <tbody>
            {sortedByProfit.map((o, i) => (
              <tr
                key={o.code}
                onClick={() => handleSelect(o.code)}
                className={`cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50 ${
                  o.code === localCode ? 'bg-rose-50/60' : ''
                }`}
              >
                <td className="px-3 py-2 tabular-nums text-slate-400">{i + 1}</td>
                <td className="px-3 py-2 font-medium text-slate-800">{o.name}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-700">{money(o.netSales)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-500">{money(o.purchases)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-900">{money(o.grossProfit)}</td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: marginColor(o.marginPct) }}>
                  {o.marginPct.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
              <td className="px-3 py-2.5" />
              <td className="px-3 py-2.5 text-slate-900">Total · {PL_BY_OUTLET.length} outlets</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{money(ENTITY_TOTALS.all.netSales)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{money(ENTITY_TOTALS.all.purchases)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{money(ENTITY_TOTALS.all.grossProfit)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">{ENTITY_TOTALS.all.grossMargin}%</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-center text-xs text-slate-400">
        Source: docs/original-capture.html · RM · {PL_BY_OUTLET.length} corporate outlets · 2 entities
      </p>
    </div>
  );
};
