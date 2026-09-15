import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PL_BY_OUTLET } from '../../data/outletData';

type EntityFilter = 'all' | 'myUsPizza' | 'sabah';

const PurchaseLabel = ({ x = 0, y = 0, width = 0, height = 0, value }: { x?: number; y?: number; width?: number; height?: number; value?: number }) => (
  typeof value === 'number' ? (
    <text x={x + width + 6} y={y + height / 2} dominantBaseline="middle" fill="#334155" fontSize={10} fontWeight={700} textAnchor="start">
      {`RM ${Math.round(value).toLocaleString()}`}
    </text>
  ) : null
);

export const PurchasesToNetSalesPage: React.FC<{ entityFilter: EntityFilter }> = ({ entityFilter }) => {
  const rows = useMemo(
    () => PL_BY_OUTLET
      .filter((outlet) => entityFilter === 'all' ? true : entityFilter === 'sabah' ? outlet.entity === 'Sabah' : outlet.entity === 'MY US PIZZA')
      .map((outlet) => ({ ...outlet, purchaseRate: (outlet.purchases / outlet.netSales) * 100 }))
      .sort((a, b) => b.purchaseRate - a.purchaseRate),
    [entityFilter]
  );

  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-2xs">6</span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Purchases-to-Net Sales</h2>
          <p className="text-xs text-slate-500">Purchases ÷ net sales × 100 · lower is more efficient</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
        <div style={{ width: '100%', height: Math.max(rows.length * 30 + 80, 160) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={rows} margin={{ top: 8, right: 72, bottom: 8, left: 8 }} barCategoryGap="20%">
              <CartesianGrid horizontal={false} stroke="#E2E8F0" />
              <XAxis type="number" unit="%" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: '#E2E8F0' }} />
              <Bar dataKey="purchaseRate" name="Purchases-to-Net Sales" fill="#14B8A6" radius={[0, 3, 3, 0]}>
                <LabelList dataKey="purchases" position="right" content={<PurchaseLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900"><span className="font-bold">Lower %:</span> more cost-efficient purchasing.</div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900"><span className="font-bold">Higher %:</span> requires review of purchasing and inventory levels.</div>
      </div>
    </div>
  );
};
