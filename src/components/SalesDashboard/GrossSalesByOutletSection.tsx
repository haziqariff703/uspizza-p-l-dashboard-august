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
import { INITIAL_OUTLETS } from '../../data/outletData';

const money = (value: number) => `RM ${Math.abs(value).toLocaleString()}`;

/**
 * Section 6, gross sales (menu price before discount) per outlet.
 * INITIAL_OUTLETS only carries 21 of the 44 real outlets — shown honestly as
 * a partial sample rather than padded out with invented figures.
 */
export const GrossSalesByOutletSection: React.FC = () => {
  const rows = useMemo(
    () =>
      INITIAL_OUTLETS
        .filter((o) => o.status === 'active')
        .map((o) => ({ name: o.name, gross: o.grossSales }))
        .sort((a, b) => b.gross - a.gross),
    []
  );

  return (
    <div className="relative space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-2xs">
          6
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Gross Sales by Outlet</h2>
          <p className="text-xs text-slate-500">Menu selling price (before discount) per outlet</p>
        </div>
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
        Gross-sales figures are only pulled through for a {rows.length}-outlet sample so far — the full 44-outlet gross dataset is pending.
      </p>

      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
        <div style={{ width: '100%', height: rows.length * 24 + 40 }}>
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
              <Bar dataKey="gross" name="Gross Sales" fill="#047857" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-400">Sample of {rows.length} outlets, ranked high → low</p>
    </div>
  );
};
