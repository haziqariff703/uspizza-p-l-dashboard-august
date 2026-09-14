import React from 'react';
import { ENTITY_TOTALS } from '../../data/outletData';
import { PlatformPanel } from './PlatformPanel';
import { SectionHeading } from './SectionHeading';
import { ChannelFilter } from '../../types';
import { BASIS_COLORS } from '../../platformColors';

interface OverviewSectionProps {
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
  channelFilter: ChannelFilter;
  onEntityFilterChange?: (filter: 'all' | 'myUsPizza' | 'sabah') => void;
}

const money = (value: number) => `RM ${Math.abs(value).toLocaleString()}`;

/**
 * Section 1 — mirrors the original capture: entity split, the four sales
 * bases with their derivation, purchases/profit/margin, then per-platform
 * net settlement.
 */
export const OverviewSection: React.FC<OverviewSectionProps> = ({
  entityFilter,
  channelFilter,
  onEntityFilterChange,
}) => {
  const totals = ENTITY_TOTALS[entityFilter];
  const group = ENTITY_TOTALS.all;
  const isGroupScope = entityFilter === 'all';

  // Only the group scope carries SC / SST / commission splits.
  const netPlusSc = isGroupScope ? group.netPlusSc : null;
  const netPlusScTax = isGroupScope ? group.netPlusScTax : null;
  const discount = totals.grossSales - totals.netSales;

  const bases = [
    { key: 'gross', label: 'Gross Sales', value: totals.grossSales, note: 'Menu selling price', color: BASIS_COLORS.gross },
    { key: 'net', label: 'Net Sales', value: totals.netSales, note: 'Menu price − discount', color: BASIS_COLORS.net },
    { key: 'netSc', label: 'Net + Service Charge', value: netPlusSc, note: '+ 10% service charge (dine-in)', color: BASIS_COLORS.netSc },
    { key: 'netScTax', label: 'Net + SC + Tax', value: netPlusScTax, note: '+ 6% SST', color: BASIS_COLORS.netScTax },
  ];

  const entities = [
    { id: 'myUsPizza' as const, legal: 'MY US PIZZA SDN BHD', totals: ENTITY_TOTALS.myUsPizza },
    { id: 'sabah' as const, legal: 'MY US PIZZA (SABAH) SDN BHD', totals: ENTITY_TOTALS.sabah },
  ];

  const scopeLabel =
    entityFilter === 'sabah' ? '2 Sabah' : entityFilter === 'myUsPizza' ? '42 MY US Pizza' : 'all 46 corporate';

  return (
    <div className="space-y-5">
      <SectionHeading
        number={1}
        title="Overview"
        subtitle={`Sales by metric · ${scopeLabel} outlets · May 2026`}
      />

      {/* Entity split — click to scope the whole dashboard */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {entities.map((entity) => {
          const isActive = entityFilter === entity.id;
          return (
            <button
              key={entity.id}
              type="button"
              onClick={() => onEntityFilterChange?.(isActive ? 'all' : entity.id)}
              aria-pressed={isActive}
              className={`rounded-2xl border bg-white p-5 text-left shadow-xs transition hover:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-400 ${
                isActive ? 'border-[#C8102E] ring-1 ring-[#C8102E]/20' : 'border-slate-200'
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{entity.legal}</div>
              <div className="mt-1 flex items-end justify-between gap-3">
                <div className="text-2xl font-bold tabular-nums text-slate-900">{money(entity.totals.netSales)}</div>
                <div className="text-sm text-slate-400">{entity.totals.outletsCount} outlets · net sales</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* The four sales bases */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {bases.map((basis) => (
          <article
            key={basis.key}
            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
          >
            <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: basis.color }} aria-hidden="true" />
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{basis.label}</div>
            <div className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums text-slate-900">
              {basis.value === null ? '—' : money(basis.value)}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {basis.value === null ? 'Group scope only' : basis.note}
            </div>
          </article>
        ))}
      </div>

      {/* Derivation strip: gross → collected */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-xs">
        <span className="font-semibold tabular-nums text-slate-800">{money(totals.grossSales)}</span> gross
        <span className="text-rose-500 tabular-nums">− {money(discount)} discount</span>
        <span className="text-slate-300" aria-hidden="true">=</span>
        <span className="font-semibold tabular-nums text-slate-800">{money(totals.netSales)}</span> net
        {isGroupScope && (
          <>
            <span className="text-sky-500 tabular-nums">+ {money(group.serviceCharge)} SC</span>
            <span className="text-teal-500 tabular-nums">+ {money(group.taxSst)} SST</span>
            <span className="text-slate-300" aria-hidden="true">=</span>
            <span className="font-semibold tabular-nums text-slate-800">{money(group.netPlusScTax)}</span> collected
          </>
        )}
      </div>

      {/* Purchases → profit → margin → net after commission */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Purchases</div>
          <div className="mt-1.5 text-xl font-bold tabular-nums text-slate-900">{money(totals.purchases)}</div>
          <div className="mt-0.5 text-xs text-slate-400">GRN received</div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gross Profit</div>
          <div className="mt-1.5 text-xl font-bold tabular-nums text-emerald-600">{money(totals.grossProfit)}</div>
          <div className="mt-0.5 text-xs text-slate-400">Net − Purchases</div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Gross Margin</div>
          <div className="mt-1.5 text-xl font-bold tabular-nums text-emerald-600">{totals.grossMargin}%</div>
          <div className="mt-0.5 text-xs text-slate-400">of net sales</div>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Net after Commission</div>
          <div className="mt-1.5 text-xl font-bold tabular-nums text-slate-900">
            {isGroupScope ? money(group.netAfterCommission) : '—'}
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            {isGroupScope ? `less ${money(group.commissionLess)} comm.` : 'Group scope only'}
          </div>
        </article>
      </div>

      <PlatformPanel channelFilter={channelFilter} />
    </div>
  );
};
