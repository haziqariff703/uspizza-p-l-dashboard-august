import React, { useMemo, useState, useEffect } from 'react';
import { WarningTriangle, NavArrowDown, NavArrowUp, Search, Xmark } from 'iconoir-react';
import { PL_BY_OUTLET, PLATFORM_DETAIL_BY_OUTLET } from '../../data/outletData';
import { PLATFORM_BRAND as PLATFORM_COLORS } from '../../platformColors';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { ToggleGroup } from '../../components/ui/toggle-group';

const money = (value: number | null) => value === null ? '—' : `RM ${value.toLocaleString()}`;
const percent = (value: number | null) => value === null ? '—' : `${value.toFixed(1)}%`;

const marginColor = (pct: number | null) => (pct === null ? '#64748B' : pct < 0 ? '#dc2626' : pct >= 60 ? '#16a34a' : '#65a30d');

/** Every platform this dashboard tracks. A platform missing from an outlet's
 * `platforms` map means "not reported yet" — never render that as a zero. */
const ALL_PLATFORMS = Object.keys(PLATFORM_COLORS);

/** A month's P&L values. May uses the captured reference data; imported months
 * pass this same shape so the layout never changes when the month changes. */
export interface PLDisplayOutlet {
  name: string;
  code: string;
  entity: string;
  netSales: number | null;
  purchases: number | null;
  grossProfit: number | null;
  marginPct: number | null;
  platforms?: Record<string, number>;
}

interface PLByOutletPageProps {
  /** Outlet code to open on mount / when the navbar search jumps here. */
  selectedCode?: string | null;
  onSelectOutlet?: (code: string) => void;
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
  /** Monthly values from imported sales/GRN data. Omit for the May reference view. */
  outletsOverride?: PLDisplayOutlet[];
  period?: string;
}

type SortKey = 'netSales' | 'purchases' | 'grossProfit' | 'marginPct';
const SORT_LABELS: Record<SortKey, string> = {
  netSales: 'Net Sales',
  purchases: 'Purchases',
  grossProfit: 'Gross Profit',
  marginPct: 'Margin',
};
type RankPreset = 'grossProfit' | 'marginAsc' | 'marginDesc' | 'custom';
const RANK_PRESETS: Record<Exclude<RankPreset, 'custom'>, [SortKey, 'asc' | 'desc']> = {
  grossProfit: ['grossProfit', 'desc'],
  marginAsc: ['marginPct', 'asc'],
  marginDesc: ['marginPct', 'desc'],
};
const ENTITY_LABELS: Record<'all' | 'myUsPizza' | 'sabah', string> = {
  all: 'all entities',
  myUsPizza: 'MY US Pizza',
  sabah: 'Sabah',
};

export const PLByOutletPage: React.FC<PLByOutletPageProps> = ({ selectedCode, onSelectOutlet, entityFilter, outletsOverride, period }) => {
  const sourceOutlets = outletsOverride ?? PL_BY_OUTLET;
  const scopedOutlets = useMemo(
    () =>
      sourceOutlets.filter((outlet) =>
        entityFilter === 'all' ? true : entityFilter === 'sabah' ? outlet.entity === 'Sabah' : outlet.entity === 'MY US PIZZA'
      ),
    [entityFilter, sourceOutlets]
  );
  const byCode = useMemo(() => new Map(scopedOutlets.map((o) => [o.code, o])), [scopedOutlets]);
  const byName = useMemo(() => [...scopedOutlets].sort((a, b) => a.name.localeCompare(b.name)), [scopedOutlets]);
  const scopeTotals = useMemo(() => {
    const complete = scopedOutlets.filter(outlet => outlet.netSales !== null && outlet.purchases !== null);
    const netSales = complete.length ? complete.reduce((sum, outlet) => sum + outlet.netSales!, 0) : null;
    const purchases = complete.length ? complete.reduce((sum, outlet) => sum + outlet.purchases!, 0) : null;
    const grossProfit = netSales !== null && purchases !== null ? netSales - purchases : null;
    return { netSales, purchases, grossProfit, grossMargin: grossProfit !== null && netSales !== null && netSales !== 0 ? (grossProfit / netSales) * 100 : null, matchedCount: complete.length };
  }, [scopedOutlets]);

  const [localCode, setLocalCode] = useState<string>(selectedCode || 'MY-030');

  // Follow an external jump (e.g. navbar search) without fighting local selection.
  useEffect(() => {
    if (selectedCode && byCode.has(selectedCode)) setLocalCode(selectedCode);
    else if (!byCode.has(localCode) && scopedOutlets[0]) setLocalCode(scopedOutlets[0].code);
  }, [byCode, localCode, scopedOutlets, selectedCode]);

  // Ranking presets drive the same sort state; column headers still sort freely.
  const [sortKey, setSortKey] = useState<SortKey>('grossProfit');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const rankPreset: RankPreset =
    sortKey === 'marginPct' ? (sortDir === 'asc' ? 'marginAsc' : 'marginDesc') : sortKey === 'grossProfit' && sortDir === 'desc' ? 'grossProfit' : 'custom';
  const applyPreset = (preset: RankPreset) => {
    if (preset === 'custom') return;
    const [key, dir] = RANK_PRESETS[preset];
    setSortKey(key);
    setSortDir(dir);
  };

  const handleSort = (key: SortKey) => {
    setSortDir((prevDir) => (key === sortKey ? (prevDir === 'desc' ? 'asc' : 'desc') : 'desc'));
    setSortKey(key);
  };

  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return byName.filter((o) => o.name.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)).slice(0, 8);
  }, [byName, query]);

  const sortedOutlets = useMemo(() => {
    const dirMul = sortDir === 'asc' ? 1 : -1;
    // Nulls always sort last, in either direction — missing data is not the
    // best or worst performer, it's unranked.
    return [...scopedOutlets].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return (av - bv) * dirMul;
    });
  }, [scopedOutlets, sortKey, sortDir]);

  const lossOutlets = useMemo(
    () => [...scopedOutlets].filter((o) => o.grossProfit !== null && o.grossProfit < 0).sort((a, b) => a.grossProfit! - b.grossProfit!),
    [scopedOutlets]
  );

  const outlet = byCode.get(localCode) || scopedOutlets[0];
  if (!outlet) return null;
  const platforms = outlet.platforms ?? PLATFORM_DETAIL_BY_OUTLET[outlet.name];
  const hasPlatforms = Boolean(platforms && Object.keys(platforms).length);
  const maxPlatform = hasPlatforms ? Math.max(...(Object.values(platforms!) as number[])) : 0;
  // Every tracked platform gets a row; unreported ones read "Not reported", never RM 0.
  const platformRows = ALL_PLATFORMS.map((p) => [p, platforms && p in platforms ? (platforms[p] as number) : null] as const).sort(
    (a, b) => (b[1] ?? -Infinity) - (a[1] ?? -Infinity)
  );
  const missingPlatforms = ALL_PLATFORMS.filter((p) => !platforms || !(p in platforms));
  const entityLabel = ENTITY_LABELS[entityFilter];
  const excludedCount = scopedOutlets.length - scopeTotals.matchedCount;
  const worstLoss = lossOutlets.length ? Math.max(...lossOutlets.map((o) => -o.grossProfit!)) : 0;
  const combinedLoss = lossOutlets.reduce((sum, o) => sum + o.grossProfit!, 0);

  const handleSelect = (code: string) => {
    setLocalCode(code);
    setQuery('');
    onSelectOutlet?.(code);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white shadow-2xs">
          7
        </span>
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">Gross Profit by Outlet</h2>
          <p className="text-xs text-slate-500">Net sales − purchases (GRN) = gross profit, ranked across every outlet</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* Selected-outlet detail card */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{outlet.name}</h3>
                <p className="text-xs uppercase tracking-wide text-slate-400">
                  {outlet.code} · {outlet.entity === 'Sabah' ? 'MY US Pizza (Sabah) Sdn Bhd' : 'MY US Pizza Sdn Bhd'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide text-slate-400">Gross margin</div>
                <div className="text-2xl font-bold tabular-nums" style={{ color: marginColor(outlet.marginPct) }}>
                  {percent(outlet.marginPct)}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Net sales by platform</div>
              {platformRows.map(([platform, value]) => (
                <div key={platform} className="flex items-center gap-3">
                  <span className={`flex w-24 shrink-0 items-center gap-1.5 text-sm ${value === null ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: PLATFORM_COLORS[platform], opacity: value === null ? 0.35 : 1 }} />
                    {platform}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    {value !== null && (
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${maxPlatform > 0 ? Math.max(0, (value / maxPlatform) * 100) : 0}%`, background: PLATFORM_COLORS[platform] }}
                      />
                    )}
                  </div>
                  <span className={`w-28 shrink-0 text-right text-sm tabular-nums ${value === null ? 'text-slate-400' : 'font-medium text-slate-700'}`}>
                    {value === null ? 'Not reported' : money(value)}
                  </span>
                </div>
              ))}
            </div>

            {missingPlatforms.length > 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-700">
                <WarningTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  No {missingPlatforms.join(', ')} data for this outlet yet — that's unknown coverage, not a zero.
                </span>
              </p>
            )}

            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">Net Sales (revenue)</span>
                <span className="font-semibold tabular-nums text-slate-900">{money(outlet.netSales)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Less: Purchases (GRN)</span>
                <span className="tabular-nums">{outlet.purchases === null ? '—' : `− ${money(outlet.purchases)}`}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base">
                <span className="font-bold text-slate-900">Gross Profit</span>
                <span className="font-bold tabular-nums" style={{ color: marginColor(outlet.marginPct) }}>
                  {money(outlet.grossProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Outlet search + combined scope */}
        <div className="lg:col-span-2">
          <label htmlFor="pl-outlet-search" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Find an outlet
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              id="pl-outlet-search"
              role="combobox"
              aria-expanded={query.trim().length > 0}
              aria-controls="pl-outlet-results"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && matches[0]) handleSelect(matches[0].code);
                if (e.key === 'Escape') setQuery('');
              }}
              placeholder={`Search ${scopedOutlets.length} outlets by name or code`}
              className="min-h-10 rounded-xl pl-9 pr-9 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
              >
                <Xmark className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
            {query.trim() && (
              <ul id="pl-outlet-results" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {matches.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-slate-400">No outlet matches “{query.trim()}”.</li>
                ) : (
                  matches.map((o) => (
                    <li key={o.code} role="option" aria-selected={o.code === localCode}>
                      <button
                        type="button"
                        onClick={() => handleSelect(o.code)}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      >
                        <span className="truncate font-medium text-slate-800">{o.name}</span>
                        <span className="shrink-0 text-xs tabular-nums" style={{ color: marginColor(o.marginPct) }}>
                          {percent(o.marginPct)}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Showing <span className="font-semibold text-slate-800">{outlet.name}</span> · or click any row below
          </p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Totals for {entityLabel} · {scopeTotals.matchedCount} of {scopedOutlets.length} outlets included
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-600">Net Sales</span>
              <span className="font-semibold tabular-nums text-slate-900">{money(scopeTotals.netSales)}</span>
            </div>
            <div className="flex justify-between py-1 text-slate-500">
              <span>Purchases</span>
              <span className="tabular-nums">− {money(scopeTotals.purchases)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-900">Gross Profit</span>
              <span className="font-bold tabular-nums text-emerald-600">
                {money(scopeTotals.grossProfit)} · {percent(scopeTotals.grossMargin)}
              </span>
            </div>
            {excludedCount > 0 && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700">
                <WarningTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{excludedCount} outlet{excludedCount === 1 ? '' : 's'} left out of these totals — missing net sales or purchases, not counted as zero.</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Exception panel: outlets whose GRN purchases exceed net sales this period */}
      {lossOutlets.length > 0 && (
        <section aria-labelledby="pl-loss-heading" className="overflow-hidden rounded-2xl border border-rose-200 bg-white shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-100 bg-rose-50/70 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#C8102E] text-white">
                <WarningTriangle className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h3 id="pl-loss-heading" className="text-sm font-bold text-rose-950">
                  {lossOutlets.length} outlet{lossOutlets.length === 1 ? '' : 's'} with negative gross profit
                </h3>
                <p className="text-xs text-rose-800/80">Purchases (GRN) exceed net sales. Check GRN timing and sales coverage first.</p>
              </div>
            </div>
            <Badge variant="negative">{money(combinedLoss)} combined</Badge>
          </div>
          <ul className="divide-y divide-slate-100">
            {lossOutlets.map((o) => {
              const loss = -o.grossProfit!;
              const active = o.code === localCode;
              return (
                <li key={o.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(o.code)}
                    aria-current={active || undefined}
                    className={`grid w-full grid-cols-1 items-center gap-2 px-4 py-3 text-left transition-colors sm:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_auto] sm:gap-5 ${
                      active ? 'bg-rose-50/60 shadow-[inset_3px_0_0_#C8102E]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-900">{o.name}</span>
                      <span className="block text-xs tabular-nums text-slate-500">
                        {money(o.netSales)} sales · {money(o.purchases)} GRN
                      </span>
                    </span>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-rose-100" title="Loss relative to the largest loss">
                      <span className="block h-full rounded-full bg-[#C8102E]" style={{ width: `${worstLoss ? (loss / worstLoss) * 100 : 0}%` }} />
                    </span>
                    <span className="flex items-baseline gap-2 sm:justify-end">
                      <span className="text-sm font-bold tabular-nums text-rose-700">− {money(loss)}</span>
                      <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-rose-800">{percent(o.marginPct)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-700">All outlets, ranked</h3>
        <ToggleGroup<RankPreset>
          aria-label="Rank outlets by"
          value={rankPreset}
          onValueChange={applyPreset}
          options={[
            { value: 'grossProfit', label: 'Gross profit' },
            { value: 'marginAsc', label: <>Margin low → high</> },
            { value: 'marginDesc', label: <>Margin high → low</> },
          ]}
        />
      </div>

      {/* Full ranked table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2.5 text-left font-semibold text-slate-500">#</th>
              <th className="px-3 py-2.5 text-left font-semibold text-slate-500">Outlet</th>
              {(['netSales', 'purchases', 'grossProfit', 'marginPct'] as SortKey[]).map((key) => (
                <th key={key} className="px-3 py-2.5 text-right font-semibold text-slate-500">
                  <button
                    type="button"
                    onClick={() => handleSort(key)}
                    className={`inline-flex items-center gap-1 ${sortKey === key ? 'font-semibold text-slate-900' : ''}`}
                  >
                    {SORT_LABELS[key]}
                    {sortKey === key &&
                      (sortDir === 'desc' ? (
                        <NavArrowDown className="h-3 w-3" aria-hidden="true" />
                      ) : (
                        <NavArrowUp className="h-3 w-3" aria-hidden="true" />
                      ))}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedOutlets.map((o, i) => {
              const excluded = o.netSales === null || o.purchases === null;
              const isLoss = o.grossProfit !== null && o.grossProfit < 0;
              return (
                <tr
                  key={o.code}
                  onClick={() => handleSelect(o.code)}
                  className={`cursor-pointer border-b border-slate-50 transition-colors ${
                    o.code === localCode ? 'bg-slate-100' : isLoss ? 'bg-rose-50/50 hover:bg-rose-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <td className="px-3 py-2 tabular-nums text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium text-slate-800">
                    {o.name}
                    {isLoss && (
                      <span className="ml-1.5 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">Loss</span>
                    )}
                    {excluded && (
                      <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Not in totals</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-700">{money(o.netSales)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-slate-500">{money(o.purchases)}</td>
                  <td className={`px-3 py-2 text-right font-semibold tabular-nums ${isLoss ? 'text-rose-700' : 'text-slate-900'}`}>{money(o.grossProfit)}</td>
                  <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: marginColor(o.marginPct) }}>
                    {percent(o.marginPct)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
              <td className="px-3 py-2.5" />
              <td className="px-3 py-2.5 text-slate-900">Matched total · {scopeTotals.matchedCount} / {scopedOutlets.length} outlets</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{money(scopeTotals.netSales)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">{money(scopeTotals.purchases)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{money(scopeTotals.grossProfit)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">{percent(scopeTotals.grossMargin)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-center text-xs text-slate-400">
        {outletsOverride ? `Source: imported sales and GRN · ${period ?? 'selected month'} · RM · ${scopedOutlets.length} outlets` : `Source: docs/original-capture.html · RM · ${PL_BY_OUTLET.length} corporate outlets · 2 entities`}
      </p>
    </div>
  );
};
