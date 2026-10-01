import React, { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PL_BY_OUTLET } from '../../data/outletData';
import type { OutletProfit } from '../../data/importedPurchases';

type EntityFilter = 'all' | 'myUsPizza' | 'sabah';
type SortOrder = 'high' | 'low';
type ChartRow = { id: string; name: string; purchases: number; net: number; purchaseRate: number };
const money = (value: number) => `RM ${value.toLocaleString('en-MY', { maximumFractionDigits: 2 })}`;
const percent = (value: number) => `${value.toFixed(1)}%`;

const RateLabel = ({ x = 0, y = 0, width = 0, height = 0, value }: { x?: number; y?: number; width?: number; height?: number; value?: number }) => (
  typeof value === 'number' ? (
    <text x={x + width + 6} y={y + height / 2} dominantBaseline="middle" fill="#334155" fontSize={10} fontWeight={700} textAnchor="start">
      {percent(value)}
    </text>
  ) : null
);

interface PurchasesToNetSalesPageProps {
  entityFilter: EntityFilter;
  /** Already scoped to the selected imported month and entity. */
  importedRows?: OutletProfit[];
  period?: string;
}

export const PurchasesToNetSalesPage: React.FC<PurchasesToNetSalesPageProps> = ({ entityFilter, importedRows, period }) => {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('high');
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const allRows: ChartRow[] = useMemo(
    () => importedRows
      ? importedRows
        .filter((outlet) => outlet.net !== null && outlet.net !== 0 && outlet.purchases !== null)
        .map((outlet) => ({ id: outlet.id, name: outlet.name, purchases: outlet.purchases!, net: outlet.net!, purchaseRate: (outlet.purchases! / outlet.net!) * 100 }))
      : PL_BY_OUTLET
        .filter((outlet) => entityFilter === 'all' ? true : entityFilter === 'sabah' ? outlet.entity === 'Sabah' : outlet.entity === 'MY US PIZZA')
        .filter((outlet) => outlet.netSales !== 0)
        .map((outlet) => ({ id: outlet.code, name: outlet.name, purchases: outlet.purchases, net: outlet.netSales, purchaseRate: (outlet.purchases / outlet.netSales) * 100 })),
    [entityFilter, importedRows]
  );
  const rows = useMemo(() => allRows
    .filter((row) => row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a, b) => (sortOrder === 'high' ? b.purchaseRate - a.purchaseRate : a.purchaseRate - b.purchaseRate) || a.name.localeCompare(b.name)),
  [allRows, search, sortOrder]);
  const pinned = rows.find((row) => row.id === pinnedId);

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-2xs">6</span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Purchases-to-Net Sales</h2>
          <p className="text-xs text-slate-500">{period ? `Imported purchases ÷ net sales · ${period}` : 'Purchases ÷ net sales × 100'} · lower is more efficient</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Search outlets" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search outlet"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-400 sm:max-w-56" />
        <button type="button" onClick={() => setSortOrder((order) => order === 'high' ? 'low' : 'high')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400">
          {sortOrder === 'high' ? 'High → Low' : 'Low → High'}
        </button>
      </div>

      {pinned && <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs shadow-sm" aria-live="polite">
        <span><strong className="text-slate-900">{pinned.name}</strong><span className="ml-2 tabular-nums text-slate-700">{percent(pinned.purchaseRate)} · Purchases {money(pinned.purchases)} · Net sales {money(pinned.net)}</span></span>
        <button type="button" onClick={() => setPinnedId(null)} className="shrink-0 font-semibold text-slate-500 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400" aria-label="Clear selected outlet">Clear</button>
      </div>}

      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
        {rows.length ? <div style={{ width: '100%', height: Math.max(rows.length * 30 + 80, 160) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={rows} margin={{ top: 8, right: 72, bottom: 8, left: 8 }} barCategoryGap="20%">
              <CartesianGrid horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as ChartRow;
                return <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
                  <div className="mb-1 font-bold text-slate-900">{row.name}</div>
                  <div className="tabular-nums text-slate-700">Purchases to net sales: {percent(row.purchaseRate)}</div>
                  <div className="tabular-nums text-slate-700">GRN purchases: {money(row.purchases)}</div>
                  <div className="tabular-nums text-slate-700">Net sales: {money(row.net)}</div>
                </div>;
              }} />
              <Bar dataKey="purchaseRate" name="Purchases-to-Net Sales" fill="#14B8A6" radius={[0, 3, 3, 0]} cursor="pointer"
                onClick={(row: ChartRow) => setPinnedId((id) => id === row.id ? null : row.id)}>
                <LabelList dataKey="purchaseRate" position="right" content={<RateLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div> : <p className="py-8 text-center text-xs text-slate-500">No outlets match your search.</p>}
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900"><span className="font-bold">Lower %:</span> more cost-efficient purchasing.</div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900"><span className="font-bold">Higher %:</span> requires review of purchasing and inventory levels.</div>
      </div>
    </div>
  );
};
