import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { PL_BY_OUTLET } from '../../data/outletData';

const money = (value: number) => `RM ${Math.abs(value).toLocaleString()}`;

/** Section 5, real GRN purchases per outlet — ported from docs/original-capture.html. */
export const PurchasesByOutletSection: React.FC = () => {
  const rows = useMemo(
    () => [...PL_BY_OUTLET].sort((a, b) => b.purchases - a.purchases),
    []
  );

  const totalPurchases = rows.reduce((sum, o) => sum + o.purchases, 0);

  return (
    <div className="relative space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-2xs">
          5
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Purchases by Outlet</h2>
          <p className="text-xs text-slate-500">Goods received (GRN) per outlet · {money(totalPurchases)} total</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
        <div style={{ width: '100%', height: rows.length * 22 + 40 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={rows}
              margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
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
              <Bar dataKey="purchases" name="Purchases (GRN)" fill="#0284C7" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-400">All {rows.length} outlets, ranked high → low</p>
    </div>
  );
};
