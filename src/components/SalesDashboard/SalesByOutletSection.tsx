import React, { useMemo, useState } from 'react';
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
import { OutletFinancialData } from '../../types';

interface SalesByOutletSectionProps {
  outlets: OutletFinancialData[];
}

type Metric = 'gross' | 'net' | 'netSc' | 'netScTax';
type ViewMode = 'total' | 'platform';

const PLATFORM_KEYS = ['Grab', 'FoodPanda', 'Shopee', 'Apps', 'POS'] as const;
type PlatformKey = (typeof PLATFORM_KEYS)[number];

// Official brand hexes from DESIGN.md
const PLATFORM_COLORS: Record<PlatformKey, string> = {
  Grab: '#00B14F',
  FoodPanda: '#D70F64',
  Shopee: '#EE4D2D',
  Apps: '#C8102E',
  POS: '#334155',
};

const TOTAL_COLOR = '#0B192C';

const INITIAL_ROWS = 12;

interface Row {
  id: string;
  name: string;
  total: number;
  Grab: number;
  FoodPanda: number;
  Shopee: number;
  Apps: number;
  POS: number;
}

export const SalesByOutletSection: React.FC<SalesByOutletSectionProps> = ({ outlets }) => {
  const [metric, setMetric] = useState<Metric>('gross');
  const [viewMode, setViewMode] = useState<ViewMode>('platform');
  const [showAll, setShowAll] = useState(false);

  const tradingOutlets = useMemo(() => outlets.filter((o) => o.status === 'active'), [outlets]);

  const rows: Row[] = useMemo(() => {
    const valueOf = (o: OutletFinancialData) => {
      if (metric === 'gross') return o.grossSales;
      if (metric === 'net') return o.netSales;
      if (metric === 'netSc') return o.netSales + o.serviceCharge;
      return o.netSales + o.serviceCharge + o.taxSst;
    };

    const platformOf = (o: OutletFinancialData): Record<PlatformKey, number> => {
      const raw = metric === 'gross' ? o.platformGross : o.platformNet;
      return {
        Grab: raw.Grab || 0,
        FoodPanda: raw.FoodPanda || 0,
        Shopee: raw.Shopee || 0,
        Apps: raw.Apps || 0,
        POS: raw.POS || 0,
      };
    };

    return [...tradingOutlets]
      .sort((a, b) => valueOf(b) - valueOf(a))
      .map((o) => {
        const platforms = platformOf(o);
        return {
          id: o.id,
          name: o.name,
          total: valueOf(o),
          ...platforms,
        };
      });
  }, [tradingOutlets, metric]);

  const visibleRows = showAll ? rows : rows.slice(0, INITIAL_ROWS);

  const getMetricTitle = () => {
    switch (metric) {
      case 'gross':
        return 'Gross Sales per HQ outlet · Menu selling price · sorted high → low';
      case 'net':
        return 'Net Sales per HQ outlet · Menu price – discount · sorted high → low';
      case 'netSc':
        return 'Net + Service Charge per HQ outlet · + 10% service charge (dine-in) · sorted high → low';
      case 'netScTax':
        return 'Net + SC + Tax per HQ outlet · + 6% SST · sorted high → low';
    }
  };

  const totalLabel =
    metric === 'gross' ? 'Gross Sales' : metric === 'net' ? 'Net Sales' : 'Net + SC + Tax';

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: Row }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 text-xs shadow-xl">
        <div className="mb-2 border-b pb-1.5 text-sm font-extrabold text-slate-900">{row.name}</div>
        <div className="space-y-1 text-slate-600">
          {viewMode === 'platform' ? (
            PLATFORM_KEYS.map((key) => (
              <div key={key} className="flex justify-between gap-4">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_COLORS[key] }} />
                  {key}
                </span>
                <span className="font-semibold tabular-nums text-slate-900">
                  RM {row[key].toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ background: TOTAL_COLOR }} />
                Total
              </span>
              <span className="font-semibold tabular-nums text-slate-900">
                RM {row.total.toLocaleString()}
              </span>
            </div>
          )}
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-1.5 font-extrabold text-slate-900">
          <span>{totalLabel}</span>
          <span className="tabular-nums">RM {row.total.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-2xs">
          4
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Sales by Outlet</h2>
          <p className="text-xs text-slate-500">Pick a metric and toggle the platform-stacked view</p>
        </div>
      </div>

      {/* Metric Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold scrollbar-none">
        {(
          [
            ['gross', 'Gross'],
            ['net', 'Net'],
            ['netSc', 'Net + SC'],
            ['netScTax', 'Net + SC + SST'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMetric(id)}
            className={`shrink-0 rounded-lg px-4 py-1.5 transition-all focus-visible:ring-2 focus-visible:ring-slate-400 ${
              metric === id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex w-fit items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold">
        {(
          [
            ['total', 'Total'],
            ['platform', 'By platform'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setViewMode(id)}
            className={`rounded-lg px-3 py-1 transition-all focus-visible:ring-2 focus-visible:ring-slate-400 ${
              viewMode === id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Subtitle */}
      <div className="text-xs font-bold text-slate-700">{getMetricTitle()}</div>

      {/* Ranked horizontal bar list */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
        <div style={{ width: '100%', height: visibleRows.length * 30 + 40 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={visibleRows}
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value: string) => <span className="text-slate-600">{value}</span>}
              />
              {viewMode === 'total' ? (
                <Bar dataKey="total" name={totalLabel} fill={TOTAL_COLOR} radius={[0, 3, 3, 0]} />
              ) : (
                PLATFORM_KEYS.map((key) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={key}
                    stackId="platform"
                    fill={PLATFORM_COLORS[key]}
                    radius={key === PLATFORM_KEYS[PLATFORM_KEYS.length - 1] ? [0, 3, 3, 0] : undefined}
                  />
                ))
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expand toggle */}
        {rows.length > INITIAL_ROWS && (
          <div className="mt-3 flex justify-center border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              aria-expanded={showAll}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {showAll ? 'Show top 12' : `Show all ${rows.length}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
