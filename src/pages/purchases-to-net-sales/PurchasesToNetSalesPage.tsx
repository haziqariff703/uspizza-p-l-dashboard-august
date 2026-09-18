import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PL_BY_OUTLET } from '../../data/outletData';
import { getSupabaseClient } from '../../lib/supabase';

type EntityFilter = 'all' | 'myUsPizza' | 'sabah';

const PurchaseLabel = ({ x = 0, y = 0, width = 0, height = 0, value }: { x?: number; y?: number; width?: number; height?: number; value?: number }) => (
  typeof value === 'number' ? (
    <text x={x + width + 6} y={y + height / 2} dominantBaseline="middle" fill="#334155" fontSize={10} fontWeight={700} textAnchor="start">
      {`RM ${Math.round(value).toLocaleString()}`}
    </text>
  ) : null
);

export interface PurchaseToNetSalesItem { outlet_id: string; outlet_name: string; outlet_code: string; total_purchases: number; total_net_sales: number; percentage: number }
export function usePurchasesToNetSales(selectedMonth?: string) {
  const [data, setData] = useState<PurchaseToNetSalesItem[] | null>(null); const [loading, setLoading] = useState(Boolean(selectedMonth));
  useEffect(() => { if (!selectedMonth) return; let active = true; const end = new Date(Number(selectedMonth.slice(0,4)), Number(selectedMonth.slice(5,7)), 0).toISOString().slice(0,10); void getSupabaseClient().rpc('get_purchases_to_net_sales',{p_start_date:`${selectedMonth}-01`,p_end_date:end}).then(({data,error})=>{if(active){setData(error?[]:(data as PurchaseToNetSalesItem[]));setLoading(false)}}); return ()=>{active=false} }, [selectedMonth]);
  return { data, loading };
}
export const PurchasesToNetSalesPage: React.FC<{ entityFilter: EntityFilter; selectedMonth?: string }> = ({ entityFilter, selectedMonth }) => {
  const { data: rpcRows, loading } = usePurchasesToNetSales(selectedMonth);
  const rows = useMemo(
    () => (rpcRows ?? PL_BY_OUTLET.map(outlet => ({ ...outlet, outlet_name: outlet.name, total_purchases: outlet.purchases, purchaseRate: (outlet.purchases / outlet.netSales) * 100 })))
      .filter((outlet) => entityFilter === 'all' ? true : entityFilter === 'sabah' ? outlet.entity === 'Sabah' : outlet.entity === 'MY US PIZZA')
      .map((outlet: any) => ({ ...outlet, name: outlet.outlet_name ?? outlet.name, purchases: Number(outlet.total_purchases ?? outlet.purchases), purchaseRate: Number(outlet.percentage ?? outlet.purchaseRate) }))
      .sort((a, b) => b.purchaseRate - a.purchaseRate), [entityFilter, rpcRows]
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

      {loading ? <div className="h-64 animate-pulse rounded-xl bg-slate-100" /> : <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
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
      </div>}

      <div className="grid gap-3 text-xs sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900"><span className="font-bold">Lower %:</span> more cost-efficient purchasing.</div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900"><span className="font-bold">Higher %:</span> requires review of purchasing and inventory levels.</div>
      </div>
    </div>
  );
};
