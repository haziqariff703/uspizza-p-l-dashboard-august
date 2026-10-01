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
import type { OutletOverview } from '../../data/importedOverview';

type Metric = 'gross' | 'discount' | 'net' | 'netSc' | 'netScTax';
type ViewMode = 'total' | 'platform';
type SortOrder = 'high' | 'low';
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
  /** When supplied, the chart uses the selected month's derived per-outlet figures. */
  outletOverviews?: OutletOverview[];
  period?: string;
}

/** Maps an OutletOverview's platform key to the derived waterfall metric. */
const METRIC_OF = {
  gross: 'gross',
  discount: 'discount',
  net: 'net',
  netSc: 'netSC',
  netScTax: 'netSCTax',
} as const satisfies Record<Metric, keyof OutletOverview['pos']>;

export const SalesByOutletPage: React.FC<SalesByOutletPageProps> = ({ entityFilter, outletOverviews, period }) => {
  const [metric, setMetric] = useState<Metric>('gross');
  const [viewMode, setViewMode] = useState<ViewMode>('platform');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('high');
  const [pinnedId, setPinnedId] = useState<string | null>(null);

  const allRows: Row[] = useMemo(() => {
    if (outletOverviews) {
      const field = METRIC_OF[metric];
      // POS is its own sales channel (POS-system sales), summed with the others.
      const platformValues = (o: OutletOverview): Record<PlatformKey, number> => ({
        Grab: o.grab[field] ?? 0,
        FoodPanda: o.foodpanda[field] ?? 0,
        Shopee: o.shopee[field] ?? 0,
        Apps: o.apps[field] ?? 0,
        POS: o.pos[field] ?? 0,
      });

      return outletOverviews
        .map((o) => {
          const platforms = platformValues(o);
          return {
            id: o.id,
            name: o.name,
            total: PLATFORM_KEYS.reduce((sum, key) => sum + platforms[key], 0),
            ...platforms,
          };
        })
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
  }, [entityFilter, outletOverviews, metric]);
  const rows = useMemo(() => allRows
    .filter((row) => row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a, b) => (sortOrder === 'high' ? b.total - a.total : a.total - b.total) || a.name.localeCompare(b.name)),
  [allRows, search, sortOrder]);
  const pinned = rows.find((row) => row.id === pinnedId);

  const getMetricTitle = () => {
    switch (metric) {
      case 'gross':
        return 'Gross Sales per HQ outlet · Menu selling price';
      case 'discount':
        return 'Discount per HQ outlet · Gross sales − net sales';
      case 'net':
        return 'Net Sales per HQ outlet · Menu price – discount';
      case 'netSc':
        return 'Net + Service Charge per HQ outlet · + 10% service charge (dine-in)';
      case 'netScTax':
        return 'Net + SC + Tax per HQ outlet · + 6% SST';
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
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Search outlets" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search outlet"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-400 sm:max-w-56" />
        <button type="button" onClick={() => setSortOrder((order) => order === 'high' ? 'low' : 'high')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400">
          {sortOrder === 'high' ? 'High → Low' : 'Low → High'}
        </button>
      </div>
      {pinned && <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs shadow-sm" aria-live="polite">
        <CustomTooltip active payload={[{ payload: pinned }]} />
        <button type="button" onClick={() => setPinnedId(null)} className="shrink-0 font-semibold text-slate-500 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400" aria-label="Clear selected outlet">Clear</button>
      </div>}
      <div>
        <div className="text-xs font-bold text-slate-700">{getMetricTitle()}</div>
        {outletOverviews && viewMode === 'platform' && (
          <p className="mt-1 text-[11px] text-slate-500">Platform bars show each imported source. POS is its own sales channel and is summed with the others.</p>
        )}
      </div>

      {/* Ranked horizontal bar list */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
        {rows.length ? <div style={{ width: '100%', height: Math.max(rows.length * 36 + 120, 200) }}>
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
                <Bar dataKey="total" name={totalLabel} fill={TOTAL_COLOR} radius={[0, 3, 3, 0]} cursor="pointer"
                  onClick={(row: Row) => setPinnedId((id) => id === row.id ? null : row.id)}>
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
                      cursor="pointer"
                      onClick={(row: Row) => setPinnedId((id) => id === row.id ? null : row.id)}
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
        </div> : <p className="py-8 text-center text-xs text-slate-500">No outlets match your search.</p>}

      </div>
    </div>
  );
};
