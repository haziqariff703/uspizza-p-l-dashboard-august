import React, { useState } from 'react';
import { NavArrowDown as ChevronDown } from 'iconoir-react';
import { COMMISSION_FEES_SUMMARY, ENTITY_TOTALS, PLATFORM_SETTLEMENTS } from '../../data/outletData';
import { PlatformPanel } from './PlatformPanel';
import { SectionHeading } from './SectionHeading';
import { ChannelFilter } from '../../types';
import { copy } from '../../copy';

interface OverviewSectionProps {
  entityFilter: 'all' | 'myUsPizza' | 'sabah';
  channelFilter: ChannelFilter;
}

const money = (value: number) => `RM ${Math.abs(value).toLocaleString()}`;

interface CalcLine {
  label: string;
  value: string;
  tone?: 'negative' | 'total';
}

interface Kpi {
  key: string;
  label: string;
  value: string;
  note: string;
  accent: string;
  badge?: string;
  calc: CalcLine[];
  caveat?: string;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({ entityFilter, channelFilter }) => {
  const [openKpi, setOpenKpi] = useState<string | null>(null);
  const totals = ENTITY_TOTALS[entityFilter];
  const discounts = totals.grossSales - totals.netSales;
  const purchasesPct = ((totals.purchases / totals.netSales) * 100).toFixed(1);

  // Platform settlement data exists at group level
  const isGroupScope = entityFilter === 'all';
  const expectedSettlement = PLATFORM_SETTLEMENTS.reduce((sum, p) => sum + p.netSettlement, 0);
  const settlementDeductions = ENTITY_TOTALS.all.netSales - expectedSettlement;

  const kpis: Kpi[] = [
    {
      key: 'net-sales',
      label: 'Net Sales',
      value: money(totals.netSales),
      note: copy.overviewNetSalesNote,
      accent: '#C8102E', // US Pizza Brand Red
      calc: [
        { label: 'Gross sales (menu price)', value: money(totals.grossSales) },
        { label: 'Less: customer discounts', value: `− ${money(discounts)}`, tone: 'negative' },
        { label: 'Net sales (reconciled)', value: money(totals.netSales), tone: 'total' },
      ],
    },
    {
      key: 'purchases',
      label: 'Total Purchases (GRN)',
      value: money(totals.purchases),
      note: `${purchasesPct}% of net sales · Goods Received Notes`,
      accent: '#0284C7', // Sky blue for inventory/GRN
      calc: [
        { label: 'Goods received (GRN confirmed)', value: money(totals.purchases) },
        { label: 'Net sales', value: money(totals.netSales) },
        { label: 'Purchases ÷ net sales ratio', value: `${purchasesPct}%`, tone: 'total' },
      ],
      caveat: copy.overviewPurchasesCaveat,
    },
    {
      key: 'gross-profit',
      label: 'Gross Profit (Provisional)',
      value: money(totals.grossProfit),
      note: 'Sales less inventory purchases',
      accent: '#047857', // Emerald for gross profit
      badge: `${totals.grossMargin}% margin`,
      calc: [
        { label: 'Net sales', value: money(totals.netSales) },
        { label: 'Less: purchases (GRN)', value: `− ${money(totals.purchases)}`, tone: 'negative' },
        { label: 'Provisional gross profit', value: money(totals.grossProfit), tone: 'total' },
      ],
      caveat: copy.overviewGrossProfitCaveat,
    },
    {
      key: 'expected-settlement',
      label: 'Expected Bank Settlement',
      value: isGroupScope ? money(expectedSettlement) : '—',
      note: isGroupScope ? 'Sum of platform net settlements' : 'Not split by entity',
      accent: '#D97706', // Warm Amber
      calc: isGroupScope
        ? [
            { label: 'Net sales', value: money(ENTITY_TOTALS.all.netSales) },
            {
              label: 'Less: platform deductions',
              value: `− ${money(settlementDeductions)}`,
              tone: 'negative',
            },
            { label: 'Expected bank payout', value: money(expectedSettlement), tone: 'total' },
          ]
        : [],
      caveat: isGroupScope
        ? `Expected cash payout. The ${money(
            settlementDeductions
          )} total deduction was previously mislabelled "commission" — actual commission is ${money(
            COMMISSION_FEES_SUMMARY.commissionMonth
          )} (see section 2).`
        : 'Platform settlement statements are grouped at the consolidated company level.',
    },
  ];

  const outletScope =
    entityFilter === 'sabah' ? '2 Sabah' : entityFilter === 'myUsPizza' ? '42 MY US Pizza' : '44 trading';

  return (
    <div className="space-y-5">
      <SectionHeading
        number={1}
        title="Executive Overview"
        subtitle={`${copy.overviewSubtitlePrefix} · ${outletScope} outlets`}
      />

      {/* AI Explanation & Status Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {copy.overviewAutoSummary}
                </h4>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">
                  {copy.overviewAutoGenerated}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                May 2026 net sales reached <strong className="text-slate-900">{money(totals.netSales)}</strong> across {outletScope} outlets at a <strong className="text-emerald-700">{totals.grossMargin}%</strong> provisional gross margin, with <strong className="text-slate-900">{money(expectedSettlement)}</strong> expected in bank receipts.
                <span className="text-amber-800 font-medium"> {copy.overviewGapNote}</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:border-l sm:border-slate-100 sm:pl-4">
            <div className="text-right">
              <span className="block text-[11px] uppercase font-bold text-slate-500">{copy.overviewReconLabel}</span>
              <span className="text-xs font-bold text-emerald-700">{copy.overviewReconState}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const isOpen = openKpi === kpi.key;
          const canOpen = kpi.calc.length > 0;
          return (
            <article
              key={kpi.key}
              className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-sm"
            >
              <span className="absolute inset-x-0 top-0 h-1" style={{ background: kpi.accent }} />
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{kpi.label}</p>
                {kpi.badge && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                    {kpi.badge}
                  </span>
                )}
              </div>
              <p className="mt-2 text-2xl font-black tracking-tight tabular-nums text-slate-900">{kpi.value}</p>
              <p className="mt-1 text-xs text-slate-500">{kpi.note}</p>

              {canOpen && (
                <button
                  type="button"
                  onClick={() => setOpenKpi(isOpen ? null : kpi.key)}
                  aria-expanded={isOpen}
                  className="mt-3.5 flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-100"
                >
                  <span>{isOpen ? copy.overviewHideCalc : copy.overviewViewCalc}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              )}

              {isOpen && (
                <dl className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs animate-in fade-in duration-150">
                  {kpi.calc.map((line) => (
                    <div
                      key={line.label}
                      className={`flex justify-between gap-3 ${
                        line.tone === 'total' ? 'border-t border-slate-200 pt-1.5 font-bold text-slate-900' : ''
                      }`}
                    >
                      <dt className={line.tone === 'total' ? 'text-slate-900' : 'text-slate-500'}>{line.label}</dt>
                      <dd
                        className={`tabular-nums font-semibold ${
                          line.tone === 'negative' ? 'text-rose-600' : 'text-slate-900'
                        }`}
                      >
                        {line.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {kpi.caveat && (
                <div className="mt-3 text-[11px] leading-4 text-slate-500 border-t border-slate-50 pt-2">
                  <span>{kpi.caveat}</span>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Platform Breakdown Panel */}
      <PlatformPanel channelFilter={channelFilter} />
    </div>
  );
};
