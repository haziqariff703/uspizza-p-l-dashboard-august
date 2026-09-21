import React, { useMemo, useState, useEffect } from 'react';
import { PL_BY_OUTLET, PLATFORM_DETAIL_BY_OUTLET } from '../../data/outletData';
import { PLATFORM_BRAND as PLATFORM_COLORS } from '../../platformColors';

const money = (value: number | null) => value === null ? '—' : `RM ${value.toLocaleString()}`;
const percent = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`;

const marginColor = (pct: number | null) => (pct === null ? '#64748B' : pct < 0 ? '#dc2626' : pct >= 60 ? '#16a34a' : '#65a30d');

/** A month's P&L values. May uses the captured reference data; imported months
 * pass this same shape so the layout never changes when the month changes. */
export interface PLDisplayOutlet {
  name: string;
  code: string;
  entity: string;
  netSales: number | null;
  purchases: number | null;
  grossProfit: number | null;
  marginPct: number | null;
  platforms?: Record<string, number>;
}

interface PLByOutletPageProps {
  /** Outlet code to open on mount / when the navbar search jumps here. */
  selectedCode?: string | null;
  onSelectOutlet?: (code: string) => void;
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
  /** Monthly values from imported sales/GRN data. Omit for the May reference view. */
  outletsOverride?: PLDisplayOutlet[];
  period?: string;
}

export const PLByOutletPage: React.FC<PLByOutletPageProps> = ({ selectedCode, onSelectOutlet, entityFilter, outletsOverride, period }) => {
  const sourceOutlets = outletsOverride ?? PL_BY_OUTLET;
  const scopedOutlets = useMemo(
    () =>
      sourceOutlets.filter((outlet) =>
        entityFilter === 'all' ? true : entityFilter === 'sabah' ? outlet.entity === 'Sabah' : outlet.entity === 'MY US PIZZA'
      ),
    [entityFilter, sourceOutlets]
  );
  const sortedByProfit = useMemo(() => [...scopedOutlets].sort((a, b) => (b.grossProfit ?? -Infinity) - (a.grossProfit ?? -Infinity)), [scopedOutlets]);
  const byCode = useMemo(() => new Map(scopedOutlets.map((o) => [o.code, o])), [scopedOutlets]);
  const byName = useMemo(() => [...scopedOutlets].sort((a, b) => a.name.localeCompare(b.name)), [scopedOutlets]);
  const scopeTotals = useMemo(() => {
    const complete = scopedOutlets.filter(outlet => outlet.netSales !== null && outlet.purchases !== null);
    const netSales = complete.length ? complete.reduce((sum, outlet) => sum + outlet.netSales!, 0) : null;
    const purchases = complete.length ? complete.reduce((sum, outlet) => sum + outlet.purchases!, 0) : null;
    const grossProfit = netSales !== null && purchases !== null ? netSales - purchases : null;
    return { netSales, purchases, grossProfit, grossMargin: grossProfit !== null && netSales !== null && netSales !== 0 ? (grossProfit / netSales) * 100 : null, matchedCount: complete.length };
  }, [scopedOutlets]);

  const [localCode, setLocalCode] = useState<string>(selectedCode || 'MY-030');

  // Follow an external jump (e.g. navbar search) without fighting local selection.
  useEffect(() => {
    if (selectedCode && byCode.has(selectedCode)) setLocalCode(selectedCode);
    else if (!byCode.has(localCode) && scopedOutlets[0]) setLocalCode(scopedOutlets[0].code);
  }, [byCode, localCode, scopedOutlets, selectedCode]);

  const outlet = byCode.get(localCode) || scopedOutlets[0];
  if (!outlet) return null;
  const platforms = outlet.platforms ?? PLATFORM_DETAIL_BY_OUTLET[outlet.name];
  const hasPlatforms = Boolean(platforms && Object.keys(platforms).length);
  const maxPlatform = hasPlatforms ? Math.max(...(Object.values(platforms!) as number[])) : 0;

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
                  {percent(outlet.marginPct)}
                </div>
              </div>
            </div>

            {hasPlatforms ? (
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Net sales by platform</div>
                {(Object.entries(platforms) as [string, number][]).map(([platform, value]) => (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="flex w-20 shrink-0 items-center gap-1.5 text-sm text-slate-600">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PLATFORM_COLORS[platform] }} />
                      {platform}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${maxPlatform ? (value / maxPlatform) * 100 : 0}%`, background: PLATFORM_COLORS[platform] }}
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
                <span className="tabular-nums">{outlet.purchases === null ? '—' : `− ${money(outlet.purchases)}`}</span>
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
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Outlets · {scopeTotals.matchedCount} matched of {scopedOutlets.length}</div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Net Sales</span>
              <span className="font-semibold tabular-nums text-slate-900">{money(scopeTotals.netSales)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-500">
              <span>Purchases</span>
              <span className="tabular-nums">− {money(scopeTotals.purchases)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-900">Gross Profit</span>
              <span className="font-bold tabular-nums text-emerald-600">
                {money(scopeTotals.grossProfit)} · {percent(scopeTotals.grossMargin)}
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
                  {percent(o.marginPct)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
              <td className="px-3 py-2.5" />
              <td className="px-3 py-2.5 text-slate-900">Matched total · {scopeTotals.matchedCount} / {scopedOutlets.length} outlets</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{money(scopeTotals.netSales)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{money(scopeTotals.purchases)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{money(scopeTotals.grossProfit)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">{percent(scopeTotals.grossMargin)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-center text-xs text-slate-400">
        {outletsOverride ? `Source: imported sales and GRN · ${period ?? 'selected month'} · RM · ${scopedOutlets.length} outlets` : `Source: docs/original-capture.html · RM · ${PL_BY_OUTLET.length} corporate outlets · 2 entities`}
      </p>
    </div>
  );
};
