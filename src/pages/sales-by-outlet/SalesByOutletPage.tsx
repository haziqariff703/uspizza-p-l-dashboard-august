import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { PLATFORM_BRAND } from '../../platformColors';
import { FULL_OUTLET_SALES } from '../../data/fullOutletSales';
import { PL_BY_OUTLET } from '../../data/outletData';
import type { ImportedRow } from '../../data/importedOverview';

type Metric = 'gross' | 'discount' | 'net' | 'netSc' | 'netScTax';
type ViewMode = 'total' | 'platform';
type EntityFilter = 'all' | 'myUsPizza' | 'sabah';

const PLATFORM_KEYS = ['Grab', 'FoodPanda', 'Shopee', 'Apps', 'POS'] as const;
type PlatformKey = (typeof PLATFORM_KEYS)[number];

const PLATFORM_COLORS = PLATFORM_BRAND as Record<PlatformKey, string>;

const TOTAL_COLOR = '#0B192C';

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

const TotalSalesLabel = ({
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
      {`RM ${Math.round(value).toLocaleString()}`}
    </text>
  );
};

const PlatformLegend = () => (
  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-2 text-[11px] text-slate-600">
    {PLATFORM_KEYS.map((key) => (
      <span key={key} className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PLATFORM_COLORS[key] }} />
        {key}
      </span>
    ))}
  </div>
);

interface SalesByOutletPageProps {
  entityFilter: EntityFilter;
  /** When supplied, the chart uses the selected month's imported daily rows. */
  importedRows?: ImportedRow[];
  period?: string;
}

const IMPORT_SOURCE_TO_PLATFORM: Record<string, PlatformKey> = {
  grab: 'Grab',
  foodpanda: 'FoodPanda',
  shopee: 'Shopee',
  apps: 'Apps',
  pos: 'POS',
};

export const SalesByOutletPage: React.FC<SalesByOutletPageProps> = ({ entityFilter, importedRows, period }) => {
  const [metric, setMetric] = useState<Metric>('gross');
  const [viewMode, setViewMode] = useState<ViewMode>('platform');

  const rows: Row[] = useMemo(() => {
    if (importedRows) {
      const metricKey: keyof Pick<ImportedRow, 'gross_sales' | 'discount' | 'net_sales' | 'service_charge' | 'tax'> =
        metric === 'gross' ? 'gross_sales' : metric === 'discount' ? 'discount' : 'net_sales';
      const outletRows = new Map<string, { id: string; name: string; platforms: Record<PlatformKey, number>; posTotal: number; hasPos: boolean }>();

      for (const imported of importedRows) {
        if (entityFilter === 'sabah' && imported.entity !== 'Sabah') continue;
        if (entityFilter === 'myUsPizza' && imported.entity !== 'MY US PIZZA') continue;
        const platform = IMPORT_SOURCE_TO_PLATFORM[imported.source.toLowerCase()];
        if (!platform) continue;
        const id = imported.outlet_id ?? `${imported.source}:${imported.outlet_name}`;
        const current = outletRows.get(id) ?? {
          id,
          name: imported.outlet_name,
          platforms: { Grab: 0, FoodPanda: 0, Shopee: 0, Apps: 0, POS: 0 },
          posTotal: 0,
          hasPos: false,
        };
        const base = Number(imported[metricKey] ?? 0);
        const serviceCharge = Number(imported.service_charge ?? 0);
        const tax = Number(imported.tax ?? 0);
        const value = metric === 'netSc' ? base + serviceCharge : metric === 'netScTax' ? base + serviceCharge + tax : base;
        current.platforms[platform] += value;
        if (platform === 'POS') {
          current.posTotal += value;
          current.hasPos = true;
        }
        outletRows.set(id, current);
      }

      return [...outletRows.values()]
        .map((outlet) => ({
          id: outlet.id,
          name: outlet.name,
          // POS is the trusted total because it already includes marketplace sales.
          total: outlet.hasPos ? outlet.posTotal : PLATFORM_KEYS.reduce((sum, key) => sum + outlet.platforms[key], 0),
          ...outlet.platforms,
        }))
        .sort((a, b) => b.total - a.total);
    }

    const entityByCode = new Map(PL_BY_OUTLET.map((outlet) => [outlet.code, outlet.entity]));
    const platformOf = (o: (typeof FULL_OUTLET_SALES)[number]): Record<PlatformKey, number> => {
      const raw =
        metric === 'gross'
          ? o.platformGross
          : metric === 'discount'
            ? Object.fromEntries(
                PLATFORM_KEYS.map((key) => [key, o.platformGross[key] - o.platformNet[key]])
              ) as Record<PlatformKey, number>
          : metric === 'net'
            ? o.platformNet
            : metric === 'netSc'
              ? o.platformNetSc
              : o.platformNetScTax;

      return { ...raw };
    };

    return FULL_OUTLET_SALES.filter((o) => {
      if (entityFilter === 'all') return true;
      return entityFilter === 'sabah'
        ? entityByCode.get(o.id) === 'Sabah'
        : entityByCode.get(o.id) === 'MY US PIZZA';
    })
      .map((o) => {
      const platforms = platformOf(o);
      return {
        id: o.id,
        name: o.name,
        total: PLATFORM_KEYS.reduce((sum, key) => sum + platforms[key], 0),
        ...platforms,
      };
    })
      .sort((a, b) => b.total - a.total)
      .map((o) => {
        return o;
      });
  }, [entityFilter, importedRows, metric]);

  const getMetricTitle = () => {
    switch (metric) {
      case 'gross':
        return 'Gross Sales per HQ outlet · Menu selling price · sorted high → low';
      case 'discount':
        return 'Discount per HQ outlet · Gross sales − net sales · sorted high → low';
      case 'net':
        return 'Net Sales per HQ outlet · Menu price – discount · sorted high → low';
      case 'netSc':
        return 'Net + Service Charge per HQ outlet · + 10% service charge (dine-in) · sorted high → low';
      case 'netScTax':
        return 'Net + SC + Tax per HQ outlet · + 6% SST · sorted high → low';
    }
  };

  const totalLabel =
    metric === 'gross' ? 'Gross Sales' : metric === 'discount' ? 'Discount' : metric === 'net' ? 'Net Sales' : 'Net + SC + Tax';

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
                  RM {Math.round(row[key]).toLocaleString()}
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
                RM {Math.round(row.total).toLocaleString()}
              </span>
            </div>
          )}
        </div>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-1.5 font-extrabold text-slate-900">
          <span>{totalLabel}</span>
          <span className="tabular-nums">RM {Math.round(row.total).toLocaleString()}</span>
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
          <p className="text-xs text-slate-500">
            {period ? `Imported sales · ${period}` : 'Pick a metric and toggle the platform-stacked view'}
          </p>
        </div>
      </div>

      {/* Metric Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold scrollbar-none">
        {(
          [
            ['gross', 'Gross'],
            ['discount', 'Discount'],
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
      <div>
        <div className="text-xs font-bold text-slate-700">{getMetricTitle()}</div>
        {importedRows && viewMode === 'platform' && (
          <p className="mt-1 text-[11px] text-slate-500">Platform bars show each imported source. POS is not added to the total because it already includes all channels.</p>
        )}
      </div>

      {/* Ranked horizontal bar list */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
        <div style={{ width: '100%', height: Math.max(rows.length * 36 + 120, 200) }}>
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F1F5F9' }} />
              <Legend
                content={<PlatformLegend />}
              />
              {viewMode === 'total' ? (
                <Bar dataKey="total" name={totalLabel} fill={TOTAL_COLOR} radius={[0, 3, 3, 0]}>
                  <LabelList
                    dataKey="total"
                    position="right"
                    content={<TotalSalesLabel />}
                  />
                </Bar>
              ) : (
                PLATFORM_KEYS.map((key) => {
                  const isFinalStack = key === PLATFORM_KEYS[PLATFORM_KEYS.length - 1];
                  return (
                    <Bar
                      key={key}
                      dataKey={key}
                      name={key}
                      stackId="platform"
                      fill={PLATFORM_COLORS[key]}
                      radius={isFinalStack ? [0, 3, 3, 0] : undefined}
                    >
                      {isFinalStack && (
                        <LabelList
                          dataKey="total"
                          position="right"
                          content={<TotalSalesLabel />}
                        />
                      )}
                    </Bar>
                  );
                })
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};
