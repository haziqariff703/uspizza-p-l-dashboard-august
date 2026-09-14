import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PLATFORM_SETTLEMENTS } from '../../data/outletData';
import { ChannelFilter } from '../../types';
import { PlatformLogo } from '../common/PlatformLogo';

interface PlatformPanelProps {
  /** Channel picked in the navbar; 'All' shows every platform. */
  channelFilter: ChannelFilter;
}

const money = (value: number) => `RM ${Math.abs(value).toLocaleString()}`;

// Map each platform to official brand colors from DESIGN.md
const PLATFORM_COLORS: Record<string, { brand: string; lightBg: string; badgeText: string }> = {
  Grab: { brand: '#00B14F', lightBg: '#ECFDF5', badgeText: '#065F46' },
  FoodPanda: { brand: '#D70F64', lightBg: '#FDF2F8', badgeText: '#9D174D' },
  Shopee: { brand: '#EE4D2D', lightBg: '#FFF7ED', badgeText: '#9A3412' },
  Apps: { brand: '#C8102E', lightBg: '#FFF1F2', badgeText: '#9F1239' },
  POS: { brand: '#334155', lightBg: '#F8FAFC', badgeText: '#1E293B' },
};

/**
 * Net settlement per platform with vector SVG marks — what share of gross sales reaches the bank.
 */
export const PlatformPanel: React.FC<PlatformPanelProps> = ({ channelFilter }) => {
  const settlements = PLATFORM_SETTLEMENTS.filter(
    (item) => channelFilter === 'All' || item.platform === channelFilter
  );

  // Gross → kept (navy/green) vs leakage (red) for the docked chart.
  const chartData = settlements.map((item) => {
    const leakage = item.grossSales + item.taxSst + item.serviceCharge - item.netSettlement;
    return {
      platform: item.platform,
      netSettlement: item.netSettlement,
      leakage,
    };
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-slate-900">
            Net Settlement by Sales Channel
          </h3>
          <p className="text-xs text-slate-500">
            Realized cash reaching the bank account after discounts, platform deductions and commissions.
          </p>
        </div>
        <span className="hidden sm:inline-flex text-[11px] font-semibold text-slate-400">
          Source: Saved Platform Settlement Reports
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        {/* Docked gross→kept vs leakage chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Gross → Kept vs Leakage
            </h4>
          </div>
          <div style={{ width: '100%', height: Math.max(chartData.length * 44 + 40, 160) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
                barCategoryGap="22%"
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
                  dataKey="platform"
                  width={80}
                  tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: number) => money(value)}
                  contentStyle={{ fontSize: 12, borderRadius: 12, borderColor: '#E2E8F0' }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(value: string) => <span className="text-slate-600">{value}</span>}
                />
                <Bar dataKey="netSettlement" name="Net kept" stackId="a" fill="#0B192C" />
                <Bar dataKey="leakage" name="Leakage" stackId="a" fill="#F43F5E" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Accessible fallback data table */}
          <table className="sr-only">
            <caption>Net settlement versus leakage per platform</caption>
            <thead>
              <tr>
                <th scope="col">Platform</th>
                <th scope="col">Net kept</th>
                <th scope="col">Leakage</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row) => (
                <tr key={row.platform}>
                  <th scope="row">{row.platform}</th>
                  <td>{money(row.netSettlement)}</td>
                  <td>{money(row.leakage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {settlements.map((item) => {
            const leakage = item.grossSales + item.taxSst + item.serviceCharge - item.netSettlement;
            const conf = PLATFORM_COLORS[item.platform] || { brand: '#64748B', lightBg: '#F8FAFC', badgeText: '#334155' };

            return (
              <article
                key={item.platform}
                className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xs transition-shadow hover:shadow-sm"
              >
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: conf.brand }} />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PlatformLogo platform={item.platform} size="sm" />
                    <span className="text-xs font-extrabold text-slate-900">{item.platform}</span>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide"
                    style={{
                      backgroundColor: item.keptPct >= 80 ? '#ECFDF5' : item.keptPct < 60 ? '#FFF1F2' : '#FFFBEB',
                      color: item.keptPct >= 80 ? '#065F46' : item.keptPct < 60 ? '#9F1239' : '#92400E',
                    }}
                  >
                    {item.keptPct}% kept
                  </span>
                </div>

                <div className="mt-2.5">
                  <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">Net Settled</span>
                  <p className="text-lg font-black tracking-tight tabular-nums text-slate-900">
                    {money(item.netSettlement)}
                  </p>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.keptPct}%`, background: conf.brand }}
                  />
                </div>

                <dl className="mt-3 space-y-1 text-[11px] tabular-nums border-t border-slate-100 pt-2.5">
                  <div className="flex justify-between text-slate-500">
                    <dt>Gross sales</dt>
                    <dd className="font-semibold text-slate-700">{money(item.grossSales)}</dd>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <dt>Discounts</dt>
                    <dd className="font-semibold text-rose-600">− {money(item.discount)}</dd>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <dt>Platform fees</dt>
                    <dd className="font-semibold text-amber-600">− {money(item.commissionFees)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1 font-bold text-slate-800">
                    <dt>Total deductions</dt>
                    <dd className="text-rose-600">− {money(leakage)}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
