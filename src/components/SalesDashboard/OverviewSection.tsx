import React, { useMemo } from 'react';
import { ChannelFilter } from '../../types';
import { BASIS_COLORS, PLATFORM_BRAND } from '../../platformColors';
import { EntityScope, aggregate, scopeCounts, scopeOutlets } from '../../data/aggregate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../ui/table';
import { cn } from '../../lib/utils';

interface OverviewSectionProps {
  entityFilter: EntityScope;
  channelFilter: ChannelFilter;
  onEntityFilterChange?: (filter: EntityScope) => void;
}

/**
 * Whole ringgit, matching the original's formatter `H` exactly — pinned to
 * en-MY, no fraction digits, and the sign preserved (per-outlet commission and
 * adjustments can be negative, so never Math.abs here).
 */
const money = (value: number) =>
  `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/** Sub-ringgit residue from summing float diffs reads as nothing, so show a dash. */
const cell = (value: number) => (Math.abs(value) < 1 ? '—' : money(value));

const ENTITY_TABS: { id: EntityScope; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'myUsPizza', label: 'MY US Pizza' },
  { id: 'sabah', label: 'Sabah' },
];

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  entityFilter,
  channelFilter,
  onEntityFilterChange,
}) => {
  const totals = useMemo(() => aggregate(scopeOutlets(entityFilter)), [entityFilter]);

  /** Net sales per entity, for the scope toggle's tooltips. */
  const entityNet = useMemo(
    () =>
      ({
        all: totals,
        myUsPizza: aggregate(scopeOutlets('myUsPizza')),
        sabah: aggregate(scopeOutlets('sabah')),
      }) as Record<EntityScope, { net: number }>,
    [totals]
  );

  // The original Overview always shows all five platforms — the channel filter
  // drives section 2, not this block. Highlight the column instead of hiding.
  const platforms = totals.byPlatform;
  const settlementTotal = platforms.reduce((sum, p) => sum + p.settlement, 0);
  const keptPctTotal = totals.grossMenu > 0 ? (settlementTotal / totals.grossMenu) * 100 : 0;

  const barSegments = [
    { key: 'net', label: 'net sales', value: totals.net, color: BASIS_COLORS.net },
    { key: 'sc', label: 'service charge', value: totals.serviceCharge, color: BASIS_COLORS.netSc },
    { key: 'sst', label: 'SST', value: totals.tax, color: BASIS_COLORS.netScTax },
    { key: 'discount', label: 'discount given up', value: totals.discount, color: '#FDA4AF' },
  ].filter((seg) => seg.value > 1);
  const barTotal = barSegments.reduce((sum, seg) => sum + seg.value, 0);

  /** Matrix rows: one derivation step, five platform columns, a total. */
  const matrixRows = [
    { label: 'Gross sales', pick: (p: (typeof platforms)[number]) => p.grossMenu, total: totals.grossMenu, tone: 'text-slate-600' },
    { label: '− Discount', pick: (p: (typeof platforms)[number]) => p.discount, total: totals.discount, tone: 'text-rose-600' },
    { label: '+ Service charge', pick: (p: (typeof platforms)[number]) => p.serviceCharge, total: totals.serviceCharge, tone: 'text-sky-600' },
    { label: '+ Tax (SST)', pick: (p: (typeof platforms)[number]) => p.tax, total: totals.tax, tone: 'text-teal-600' },
    {
      label: '− Commission & fees',
      pick: (p: (typeof platforms)[number]) => p.commissionAndFees,
      total: platforms.reduce((sum, p) => sum + p.commissionAndFees, 0),
      tone: 'text-amber-600',
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#C8102E] text-sm font-bold text-white">
            1
          </span>
          <div>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              Sales by metric · {totals.outletCount} outlets · May 2026
            </CardDescription>
          </div>
        </div>

        <div
          role="group"
          aria-label="Entity scope"
          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold"
        >
          {ENTITY_TABS.map((tab) => {
            const isActive = entityFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onEntityFilterChange?.(tab.id)}
                aria-pressed={isActive}
                title={`${scopeCounts[tab.id]} outlets · net sales ${money(entityNet[tab.id].net)}`}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400',
                  isActive ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {tab.label} · {scopeCounts[tab.id]}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Hero */}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Net Sales</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 sm:text-4xl">
              {money(totals.net)}
            </p>
            <p className="mt-1 text-xs text-slate-400">Menu price − discount</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="positive">{totals.margin.toFixed(1)}% gross margin</Badge>
            <Badge>GP {money(totals.grossProfit)}</Badge>
          </div>
        </div>

        {/* Gross → collected */}
        <section aria-label="Gross to collected derivation">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gross → Collected</h3>
            <p className="text-xs text-slate-400 tabular-nums">
              Gross <span className="font-semibold text-slate-600">{money(totals.grossMenu)}</span>
            </p>
          </div>

          <div
            className="mt-2 flex h-7 w-full overflow-hidden rounded-lg bg-slate-100"
            role="img"
            aria-label={barSegments.map((s) => `${s.label} ${money(s.value)}`).join(', ')}
          >
            {barSegments.map((seg) => (
              <div
                key={seg.key}
                style={{ width: `${(seg.value / barTotal) * 100}%`, background: seg.color }}
                title={`${seg.label}: ${money(seg.value)}`}
                className="transition-all duration-500 motion-reduce:transition-none"
              />
            ))}
          </div>

          <dl className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
            {barSegments.map((seg) => (
              <div key={seg.key} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ background: seg.color }} aria-hidden="true" />
                <dt className="text-slate-500">{seg.label}</dt>
                <dd className="font-semibold tabular-nums text-slate-800">{money(seg.value)}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 tabular-nums">
            <span className="font-semibold text-slate-800">{money(totals.grossMenu)}</span> gross
            <span className="text-rose-500">− {money(totals.discount)} discount</span>
            <span className="text-slate-300" aria-hidden="true">=</span>
            <span className="font-semibold text-slate-800">{money(totals.net)}</span> net
            <span className="text-sky-500">+ {money(totals.serviceCharge)} SC</span>
            <span className="text-slate-300" aria-hidden="true">=</span>
            <span className="font-semibold text-slate-800">{money(totals.netSC)}</span>
            <span className="text-teal-500">+ {money(totals.tax)} SST</span>
            <span className="text-slate-300" aria-hidden="true">=</span>
            <span className="font-semibold text-slate-900">{money(totals.netSCTax)}</span> collected
          </p>
        </section>

        <Separator />

        {/* Profitability */}
        <section aria-label="Profitability">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {[
              { label: 'Total Purchases', value: money(totals.purchases), note: 'GRN received', tone: 'text-slate-900' },
              { label: 'Gross Profit', value: money(totals.grossProfit), note: 'Net − Purchases', tone: 'text-emerald-600' },
              { label: 'Gross Margin', value: `${totals.margin.toFixed(1)}%`, note: 'of net sales', tone: 'text-emerald-600' },
              {
                label: 'Net after Commission',
                value: money(totals.netAfterCommission),
                note: `less ${money(totals.commission)} comm.`,
                tone: 'text-slate-900',
              },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</dt>
                <dd className={cn('mt-1 text-xl font-bold tabular-nums', stat.tone)}>{stat.value}</dd>
                <dd className="mt-0.5 text-xs text-slate-400">{stat.note}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Separator />

        {/* Net settlement by platform — matrix */}
        <section aria-label="Net settlement by platform">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Net Settlement by Platform
            </h3>
            <p className="text-xs text-slate-400">
              What actually reaches the bank, and how each figure derives from gross sales.
            </p>
          </div>

          {/* Share of bank receipts — the at-a-glance comparison */}
          <div
            className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={platforms.map((p) => `${p.label} ${money(p.settlement)}`).join(', ')}
          >
            {platforms.map((p) => (
              <div
                key={p.platform}
                style={{
                  width: `${(p.settlement / settlementTotal) * 100}%`,
                  background: PLATFORM_BRAND[p.label] ?? '#64748B',
                }}
                title={`${p.label}: ${money(p.settlement)} · ${((p.settlement / settlementTotal) * 100).toFixed(0)}% of settlement`}
                className="transition-all duration-500 motion-reduce:transition-none"
              />
            ))}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400">
            {platforms.map((p) => (
              <span key={p.platform} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ background: PLATFORM_BRAND[p.label] ?? '#64748B' }}
                  aria-hidden="true"
                />
                {p.label}
                <span className="tabular-nums">
                  {((p.settlement / settlementTotal) * 100).toFixed(0)}%
                </span>
              </span>
            ))}
          </div>

          <div className="mt-3 rounded-xl border border-slate-200">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="sticky left-0 bg-white">Derivation</TableHead>
                  {platforms.map((p) => {
                    const isFiltered = channelFilter !== 'All' && channelFilter === p.label;
                    return (
                      <TableHead
                        key={p.platform}
                        className={cn('text-right', isFiltered && 'bg-slate-50 text-slate-900')}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: PLATFORM_BRAND[p.label] ?? '#64748B' }}
                            aria-hidden="true"
                          />
                          {p.label}
                        </span>
                      </TableHead>
                    );
                  })}
                  <TableHead className="text-right text-slate-900">Total</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {matrixRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className={cn('sticky left-0 bg-white font-medium whitespace-nowrap', row.tone)}>
                      {row.label}
                    </TableCell>
                    {platforms.map((p) => {
                      const isFiltered = channelFilter !== 'All' && channelFilter === p.label;
                      return (
                        <TableCell
                          key={p.platform}
                          className={cn('text-right tabular-nums text-slate-700', isFiltered && 'bg-slate-50/70')}
                        >
                          {cell(row.pick(p))}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-semibold tabular-nums text-slate-800">
                      {cell(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="sticky left-0 bg-slate-50 whitespace-nowrap text-slate-900">
                    = Net settlement
                  </TableCell>
                  {platforms.map((p) => {
                    const isFiltered = channelFilter !== 'All' && channelFilter === p.label;
                    return (
                      <TableCell
                        key={p.platform}
                        className={cn('text-right tabular-nums text-slate-900', isFiltered && 'bg-slate-100')}
                      >
                        {money(p.settlement)}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-right tabular-nums text-slate-900">{money(settlementTotal)}</TableCell>
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="sticky left-0 bg-slate-50 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-slate-500">
                    % kept
                  </TableCell>
                  {platforms.map((p) => (
                    <TableCell
                      key={p.platform}
                      className="text-right text-xs font-semibold tabular-nums text-slate-500"
                      title={`${money(p.settlement)} of ${money(p.grossMenu)} gross sales`}
                    >
                      {p.keptPct.toFixed(0)}%
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-xs font-semibold tabular-nums text-slate-500">
                    {keptPctTotal.toFixed(0)}%
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <p className="mt-2 text-[11px] text-slate-400">
            Commission &amp; fees here is the residual the platform withheld (collected − settled), so it differs
            from section 2's itemised fee report by design.
          </p>
        </section>
      </CardContent>
    </Card>
  );
};
