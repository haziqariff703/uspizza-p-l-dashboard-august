import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PL_BY_OUTLET } from '../../data/outletData';
import type { PurchaseRow } from '../../data/importedPurchases';

const money = (value: number) => `RM ${Math.abs(value).toLocaleString()}`;
type EntityFilter = 'all' | 'myUsPizza' | 'sabah';
type SortOrder = 'high' | 'low';
type ChartRow = { id: string; name: string; purchases: number };

const PurchaseLabel = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  value,
}: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
}) => {
  if (typeof value !== 'number') return null;

  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      dominantBaseline="middle"
      fill="#334155"
      fontSize={10}
      fontWeight={700}
      textAnchor="start"
    >
      {money(value)}
    </text>
  );
};

interface PurchasesByOutletPageProps {
  entityFilter: EntityFilter;
  /** GRN purchases for the selected imported month. */
  importedPurchases?: PurchaseRow[];
  period?: string;
}

/** Section 5, GRN purchases ranked by outlet. */
export const PurchasesByOutletPage: React.FC<PurchasesByOutletPageProps> = ({ entityFilter, importedPurchases, period }) => {
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('high');
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const allRows: ChartRow[] = useMemo(() => {
    if (importedPurchases) {
      const totals = new Map<string, { name: string; purchases: number }>();
      for (const purchase of importedPurchases) {
        if (entityFilter === 'sabah' && purchase.entity !== 'Sabah') continue;
        if (entityFilter === 'myUsPizza' && purchase.entity !== 'MY US PIZZA') continue;
        // An absent amount is unknown, not a RM 0 purchase.
        if (purchase.purchase_amount === null) continue;
        const current = totals.get(purchase.outlet_id) ?? { name: purchase.outlet_name, purchases: 0 };
        current.purchases += Number(purchase.purchase_amount);
        totals.set(purchase.outlet_id, current);
      }
      return [...totals.entries()].map(([id, row]) => ({ id, ...row }));
    }

    return PL_BY_OUTLET.filter((outlet) =>
      entityFilter === 'all' ? true : entityFilter === 'sabah' ? outlet.entity === 'Sabah' : outlet.entity === 'MY US PIZZA'
    ).map((outlet) => ({ id: outlet.code, name: outlet.name, purchases: outlet.purchases }));
  }, [entityFilter, importedPurchases]);

  const rows = useMemo(() => allRows
    .filter((row) => row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a, b) => (sortOrder === 'high' ? b.purchases - a.purchases : a.purchases - b.purchases) || a.name.localeCompare(b.name)),
  [allRows, search, sortOrder]);
  const pinned = rows.find((row) => row.id === pinnedId);
  const totalPurchases = allRows.reduce((sum, row) => sum + row.purchases, 0);

  return (
    <div className="relative space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-2xs">
          5
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Purchases by Outlet</h2>
          <p className="text-xs text-slate-500">
            {period ? `Imported GRN purchases · ${period}` : 'Goods received (GRN) per outlet'} · {money(totalPurchases)} total
          </p>
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
        <span><strong className="text-slate-900">{pinned.name}</strong><span className="ml-2 tabular-nums text-slate-700">GRN purchases: {money(pinned.purchases)}</span></span>
        <button type="button" onClick={() => setPinnedId(null)} className="shrink-0 font-semibold text-slate-500 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400" aria-label="Clear selected outlet">Clear</button>
      </div>}

      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
        {rows.length ? <div style={{ width: '100%', height: Math.max(rows.length * 30 + 80, 160) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={rows}
              margin={{ top: 8, right: 88, bottom: 8, left: 8 }}
              barCategoryGap="20%"
            >
              <CartesianGrid horizontal={false} stroke="#E2E8F0" />
              <XAxis
                type="number"
                tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                tick={{ fontSize: 10, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={150}
                tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => money(value)}
                contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: '#E2E8F0' }}
              />
              <Bar dataKey="purchases" name="Purchases (GRN)" fill="#0284C7" radius={[0, 3, 3, 0]} cursor="pointer"
                onClick={(row: ChartRow) => setPinnedId((id) => id === row.id ? null : row.id)}>
                <LabelList dataKey="purchases" position="right" content={<PurchaseLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div> : <p className="py-8 text-center text-xs text-slate-500">No outlets match your search.</p>}
      </div>

      <p className="text-center text-[11px] text-slate-400">{rows.length} of {allRows.length} outlets, ranked {sortOrder === 'high' ? 'high → low' : 'low → high'}</p>
    </div>
  );
};
