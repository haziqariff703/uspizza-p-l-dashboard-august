import React, { useMemo } from 'react';
import { ChannelFilter } from '../../types';
import { BASIS_COLORS, PLATFORM_BRAND } from '../../platformColors';
import { EntityScope, aggregate, scopeCounts, scopeOutlets } from '../../data/aggregate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Separator } from '../../components/ui/separator';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';
import { DERIVED_CHARGES, sumKnown, type DerivedField, type OverviewValues } from '../../data/importedOverview';

interface OverviewPageProps {
  entityFilter: EntityScope;
  channelFilter: ChannelFilter;
  onEntityFilterChange?: (filter: EntityScope) => void;
  imported?: { totals: OverviewValues; counts: Record<EntityScope, number> };
  period?: string;
}

/**
 * Whole ringgit, matching the original's formatter `H` exactly — pinned to
 * en-MY, no fraction digits, and the sign preserved (per-outlet commission and
 * adjustments can be negative, so never Math.abs here).
 */
const money = (value: number | null) => value === null ? 'Unavailable' :
  `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const percent = (value: number | null, digits = 0) => value === null ? 'Unavailable' : `${value.toFixed(digits)}%`;

/** Sub-ringgit residue from summing float diffs reads as nothing, so show a dash. */
const cell = (value: number | null) => value === null ? 'Unavailable' : (Math.abs(value) < 1 ? '—' : money(value));

const ENTITY_TABS: { id: EntityScope; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'myUsPizza', label: 'MY US Pizza' },
  { id: 'sabah', label: 'Sabah' },
];

export const OverviewPage: React.FC<OverviewPageProps> = ({
  entityFilter,
  channelFilter,
  onEntityFilterChange,
  imported,
  period = 'May 2026',
}) => {
  const sampleTotals = useMemo(() => aggregate(scopeOutlets(entityFilter)), [entityFilter]);
  const totals: OverviewValues = imported?.totals ?? sampleTotals;
  const counts = imported?.counts ?? scopeCounts;

  /** Net sales per entity, for the scope toggle's tooltips. */
  const entityNet = useMemo(
    () =>
      imported
        // Imported tooltips read the live counts instead; no demo aggregate is
        // computed under imported figures.
        ? ({ all: totals, myUsPizza: { net: null }, sabah: { net: null } } as unknown as Record<EntityScope, { net: number }>)
        : ({
            all: totals,
            myUsPizza: aggregate(scopeOutlets('myUsPizza')),
            sabah: aggregate(scopeOutlets('sabah')),
          }) as Record<EntityScope, { net: number }>,
    [imported, totals]
  );

  // The original Overview always shows all five platforms — the channel filter
  // drives section 2, not this block. Highlight the column instead of hiding.
  const platforms = totals.byPlatform;
  // A platform with no settlement source must not blank out the platforms that
  // have one: the shares are of the settlements actually reported, and the
  // platforms without a payout source are named beneath the bar.
  const settledPlatforms = platforms.filter(p => p.settlement !== null);
  const settlementKnown = settledPlatforms.length ? sumKnown(settledPlatforms.map(p => p.settlement)) : null;
  const unsettledLabels = platforms.filter(p => p.settlement === null && p.platform !== 'pos').map(p => p.label);
  // POS is all-channel, so in imported mode the last column is the POS source,
  // not a cross-platform total — a partial platform sum does not belong there.
  const posPlatform = platforms.find(p => p.platform === 'pos');
  const settlementTotal = imported ? posPlatform?.settlement ?? null : settlementKnown;
  // A partial numerator over a full gross denominator would be a wrong ratio,
  // not a partial one, so it stays unavailable rather than understating.
  const keptPctTotal = settlementTotal === null || totals.grossMenu === null ? null : totals.grossMenu > 0 ? (settlementTotal / totals.grossMenu) * 100 : 0;

  const barSegments = [
    { key: 'net', label: 'net sales', value: totals.net, color: BASIS_COLORS.net },
    { key: 'sc', label: 'service charge', value: totals.serviceCharge, color: BASIS_COLORS.netSc },
    { key: 'sst', label: 'SST', value: totals.tax, color: BASIS_COLORS.netScTax },
    { key: 'discount', label: 'discount given up', value: totals.discount, color: '#FDA4AF' },
  ].filter((seg) => seg.value !== null && seg.value > 1);
  const barTotal = barSegments.reduce((sum, seg) => sum + (seg.value ?? 0), 0);

  /** Matrix rows: one derivation step, five platform columns, a total. */
  const matrixRows = [
    { label: 'Gross sales', field: null, pick: (p: (typeof platforms)[number]) => p.grossMenu, total: totals.grossMenu, tone: 'text-slate-600' },
    { label: '− Discount', field: null, pick: (p: (typeof platforms)[number]) => p.discount, total: totals.discount, tone: 'text-rose-600' },
    { label: '+ Service charge', field: 'serviceCharge', pick: (p: (typeof platforms)[number]) => p.serviceCharge, total: totals.serviceCharge, tone: 'text-sky-600' },
    { label: '+ Tax (SST)', field: 'tax', pick: (p: (typeof platforms)[number]) => p.tax, total: totals.tax, tone: 'text-teal-600' },
    {
      label: '− Commission & fees',
      field: null,
      pick: (p: (typeof platforms)[number]) => p.commissionAndFees,
      total: sumKnown(platforms.map(p => p.commissionAndFees)),
      tone: 'text-amber-600',
    },
  ] satisfies Array<{ label: string; field: DerivedField | null; pick: (p: (typeof platforms)[number]) => number | null; total: number | null; tone: string }>;
  /** Only imported figures are derived; the May sample states every charge. */
  const derived = (platform: string, field: DerivedField | null) =>
    imported && field ? DERIVED_CHARGES.get(platform)?.fields.includes(field) ?? false : false;
  const derivedNotes = imported
    ? platforms.filter(p => DERIVED_CHARGES.has(p.platform)).map(p => DERIVED_CHARGES.get(p.platform)!.note)
    : [];

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
              Sales by metric · {totals.outletCount} outlets · {period}
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
                title={imported ? `${counts[tab.id]} imported POS outlets` : `${counts[tab.id]} outlets · net sales ${money(entityNet[tab.id].net)}`}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-slate-400',
                  isActive ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {tab.label} · {counts[tab.id]}
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
            <p className="mt-1 text-xs text-slate-400">{imported ? 'Imported POS coverage · all channels · before SST' : 'Menu price − discount'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={totals.margin === null ? 'default' : 'positive'}>{percent(totals.margin, 1)} gross margin</Badge>
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
                style={{ width: `${barTotal > 0 ? ((seg.value ?? 0) / barTotal) * 100 : 0}%`, background: seg.color }}
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
              { label: 'Total Purchases', value: money(totals.purchases), note: imported ? 'August GRN source required' : 'GRN received', tone: 'text-slate-900' },
              { label: 'Gross Profit', value: money(totals.grossProfit), note: 'Net − Purchases', tone: 'text-emerald-600' },
              { label: 'Gross Margin', value: percent(totals.margin, 1), note: 'of net sales', tone: 'text-emerald-600' },
              {
                label: 'Net after Commission',
                value: money(totals.netAfterCommission),
                note: imported ? 'Verified commission and settlement required' : `less ${money(totals.commission)} comm.`,
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
              {imported ? 'Reported payouts and reconciliation from available sales bases.' : 'What actually lands in the bank, and how each number is worked out from gross sales.'}
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
                  width: `${settlementKnown !== null && p.settlement !== null && settlementKnown > 0 ? (p.settlement / settlementKnown) * 100 : 0}%`,
                  background: PLATFORM_BRAND[p.label] ?? '#64748B',
                }}
                title={`${p.label}: ${money(p.settlement)}`}
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
                  {percent(p.settlement === null || settlementKnown === null ? null : settlementKnown > 0 ? (p.settlement / settlementKnown) * 100 : 0)}
                </span>
              </span>
            ))}
          </div>
          {unsettledLabels.length > 0 && (
            <p className="mt-1.5 text-[11px] text-amber-600">
              Shares are of {money(settlementKnown)} in reported settlements. {unsettledLabels.join(' and ')} {unsettledLabels.length > 1 ? 'have' : 'has'} no
              settlement source yet, so {unsettledLabels.length > 1 ? 'they are' : 'it is'} not in the bar.
            </p>
          )}

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
                  <TableHead className="text-right text-slate-900">{imported ? 'All-channel POS' : 'Total'}</TableHead>
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
                      const isDerived = derived(p.platform, row.field);
                      return (
                        <TableCell
                          key={p.platform}
                          className={cn('text-right tabular-nums text-slate-700', isFiltered && 'bg-slate-50/70')}
                          title={isDerived ? DERIVED_CHARGES.get(p.platform)!.note : undefined}
                        >
                          {cell(row.pick(p))}
                          {isDerived && (
                            <span className="ml-1 text-[10px] font-semibold uppercase text-amber-600">
                              {row.field === 'serviceCharge' ? 'calc 10%' : 'calc 6%'}
                            </span>
                          )}
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
                      {percent(p.keptPct)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right text-xs font-semibold tabular-nums text-slate-500">
                    {percent(keptPctTotal)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>

          <p className="mt-2 text-[11px] text-slate-400">
            {imported ? (
              <>
                Each column derives gross − discount = net, then + service charge + SST = collected, then − commission &amp; fees = settlement.
                {derivedNotes.map(note => ` ${note}.`)}
                {' '}Shopee and Foodpanda discount is the whole customer reduction, because both itemise promotions on a tax-inclusive basis.
                {' '}Shopee&apos;s export carries no commission line, so its deduction row reflects only what the source states.
                {' '}Apps settlement and fees stay unavailable until a bank-payout report exists — an order grand total is not money received.
                {' '}Legacy Grab gross and pre-tax sales require source reconciliation. POS totals cover all channels, so no POS-only split is shown.
              </>
            ) : "Commission & fees here is what's left over after the platform's cut (collected − settled), so it will not match section 2's detailed fee report — that is expected."}
          </p>
        </section>
      </CardContent>
    </Card>
  );
};
