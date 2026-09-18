import React, { useEffect, useMemo, useState } from 'react'
import { WarningTriangle } from 'iconoir-react'
import {
  FEE_CATEGORIES,
  FEE_PLATFORMS,
  type FeeCell,
  type FeeCategoryKey,
  type FeeColumnId,
  type FeePlatformId,
  type FeePlatformView,
  type FeesViewModel,
} from '../../data/feesViewModel'
import { ChannelFilter } from '../../types'
import { FEE_TYPE_COLORS, PLATFORM_BRAND } from '../../platformColors'
import { PlatformLogo } from '../../components/common/PlatformLogo'
import { SectionHeading } from '../../components/SalesDashboard/SectionHeading'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '../../components/ui/table'

interface FeesSectionProps {
  model: FeesViewModel
  channelFilter: ChannelFilter
}

type PlatformSelection = 'all' | FeePlatformId

/* ------------------------------ Formatting ------------------------------ */

/** Formats an exact decimal string as RM using integer/cent parts so a large
 *  figure never passes through a lossy float. */
function formatDecimal(value: string): string {
  const negative = value.startsWith('-')
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.')
  const cents = (fraction + '00').slice(0, 2)
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '− ' : ''}RM ${grouped}.${cents}`
}

const isCredit = (value: string) => value.startsWith('-')
const isZero = (value: string) => /^-?0(\.0+)?$/.test(value)

/* --------------------------------- Cells --------------------------------- */

/** Known -> RM figure (explicit zero included, distinct from unknown);
 *  unknown -> Unavailable; none -> Not supplied. */
function Cell({ cell, credit = true }: { cell: FeeCell; credit?: boolean }) {
  if (cell.state === 'none') return <span className="text-xs font-medium text-slate-400">Not supplied</span>
  if (cell.state === 'unknown' || cell.value === null) return <span className="text-xs font-medium text-amber-700">Unavailable</span>
  const value = cell.value
  const creditClass = credit && isCredit(value) ? 'font-semibold text-emerald-600' : ''
  return (
    <span className={`tabular-nums ${creditClass} ${isZero(value) ? 'text-slate-500' : ''}`}>
      {formatDecimal(value)}
    </span>
  )
}

/* ---------------------------------- Page --------------------------------- */

export const FeesSection: React.FC<FeesSectionProps> = ({ model, channelFilter }) => {
  const [active, setActive] = useState<PlatformSelection>('all')

  const filterIsPlatform = channelFilter !== 'All' && (FEE_PLATFORMS as readonly string[]).includes(channelFilter)
  const selected: PlatformSelection = filterIsPlatform ? (channelFilter as FeePlatformId) : active

  useEffect(() => {
    setActive(filterIsPlatform ? (channelFilter as FeePlatformId) : 'all')
  }, [channelFilter, filterIsPlatform])

  const visible = useMemo(
    () => (selected === 'all' ? model.platforms : model.platforms.filter((entry) => entry.platform === selected)),
    [model.platforms, selected],
  )

  if (model.empty) {
    return (
      <section className="space-y-5">
        <SectionHeading
          number={2}
          title="Commission & Fees Breakdown"
          subtitle={`${model.period} · no imported fee source for this period`}
        />
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-900">
          <WarningTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>
            No fee-bearing platform report (Grab, FoodPanda, Shopee, or Apps) has been imported for {model.period}. No KPI or matrix
            figure is shown, because a month with no source is not a month of zeros.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-5">
      {/* 1 — Heading + period-aware subtitle */}
      <SectionHeading
        number={2}
        title="Commission & Fees Breakdown"
        subtitle={`${model.period} · what each platform charges — select a platform to focus the matrix`}
      />

      {/* 2 — KPI cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Advertising spend / month" cell={model.totals.advertisingSpend} detail="Explicit advertising values only." />
        <KpiCard label="Commission / month" cell={model.totals.commission} detail="Commission is not persisted separately in the current imports." />
        <KpiCard
          label="Total fees / month"
          cell={model.totals.totalFees}
          detail={totalDetail(model)}
          valueClassName={model.totals.totalFees.state === 'known' ? 'text-[#C8102E]' : undefined}
        />
      </div>

      {/* 3 + 4 — Tabs directly above the matrix they filter */}
      <div>
        <PlatformTabs selected={selected} onSelect={setActive} />
        <FeeMatrix highlight={selected} model={model} />
      </div>

      {/* 5 — Composition cards + legend (only for a complete known total) */}
      <div>
        <h3 className="text-sm font-bold text-slate-900">Fee composition by platform</h3>
        <p className="mt-0.5 text-xs text-slate-500">How each platform's known categories split. A platform with unavailable categories has no bar.</p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {visible.map((entry) => <CompositionCard key={entry.platform} entry={entry} />)}
        </div>
        <CompositionLegend />
      </div>

      {/* 6 — Source, coverage and limitation note */}
      <CoverageNote model={model} visible={visible} />

      {/* 7 — Reconciliation, only when its evidence gate passes */}
      <ReconciliationPanel model={model} />
    </section>
  )
}

const totalDetail = (model: FeesViewModel): string => {
  if (model.totals.totalFees.state === 'none') return 'No imported fee source exists for the selected period.'
  if (model.totals.totalFees.state === 'unknown') {
    return model.totals.totalFeesPartialValue !== null
      ? `Partial known subtotal ${formatDecimal(model.totals.totalFeesPartialValue)} — not a complete month total.`
      : 'One or more applicable source values were not supplied.'
  }
  return 'Every applicable value is known and complete for this period.'
}

/* ---------------------------------- KPI ---------------------------------- */

function KpiCard({ label, cell, detail, valueClassName }: { label: string; cell: FeeCell; detail: string; valueClassName?: string }) {
  const unavailable = cell.state !== 'known' || cell.value === null
  const display = cell.state === 'none' ? 'Not supplied' : unavailable ? 'Unavailable' : formatDecimal(cell.value!)
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-xs">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-black leading-none tracking-tight tabular-nums ${unavailable ? 'text-slate-400' : 'text-slate-900'} ${!unavailable && valueClassName ? valueClassName : ''}`}>
        {display}
      </p>
      <p className="mt-1.5 text-xs leading-4 text-slate-500">{detail}</p>
    </div>
  )
}

/* ----------------------------- Platform tabs ------------------------------ */

function PlatformTabs({ selected, onSelect }: { selected: PlatformSelection; onSelect: (p: PlatformSelection) => void }) {
  const tabs: { key: PlatformSelection; label: string }[] = [
    { key: 'all', label: 'All platforms' },
    ...FEE_PLATFORMS.map((platform) => ({ key: platform as PlatformSelection, label: platform })),
  ]
  return (
    <div
      role="group"
      aria-label="Filter fee matrix by platform"
      className="mb-2 inline-flex max-w-full flex-wrap gap-0.5 rounded-lg border border-slate-200 bg-slate-100/70 p-0.5"
    >
      {tabs.map((tab) => {
        const isActive = selected === tab.key
        return (
          <button
            key={tab.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(tab.key)}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E] focus-visible:ring-offset-1 ${
              isActive ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.key !== 'all' && (
              <span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_BRAND[tab.key] }} aria-hidden="true" />
            )}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------- Fee matrix ------------------------------- */

function FeeMatrix({ highlight, model }: { highlight: PlatformSelection; model: FeesViewModel }) {
  const stickyCol = 'sticky left-0 z-10'
  const cellHasPartial = (key: FeeCategoryKey, column: FeeColumnId): boolean => {
    if (column === 'Total') return model.matrix[key].Total.state !== 'known'
    return model.matrix[key][column].state !== 'known'
  }

  return (
    <div
      role="region"
      aria-label="Detailed fee matrix by platform"
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8102E]"
    >
      <Table className="min-w-[640px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={`${stickyCol} bg-white`}>Fee type</TableHead>
            {FEE_PLATFORMS.map((platform) => (
              <TableHead key={platform} className={`text-right ${highlight === platform ? 'bg-slate-50 text-slate-900' : ''}`}>
                <span className="inline-flex items-center justify-end gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_BRAND[platform] }} aria-hidden="true" />
                  {platform}
                </span>
              </TableHead>
            ))}
            <TableHead className="text-right text-slate-900">Total</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {FEE_CATEGORIES.map((row) => {
            const commissionRate = model.platforms.some((entry) => entry.commissionRate.state === 'known')
            const rateIndent = row.key === 'commission'
            return (
              <React.Fragment key={row.key}>
                <TableRow>
                  <TableCell className={`${stickyCol} bg-white font-semibold whitespace-nowrap text-slate-800`}>{row.label}</TableCell>
                  {FEE_PLATFORMS.map((platform) => (
                    <TableCell
                      key={platform}
                      className={`text-right tabular-nums text-slate-700 ${highlight === platform ? 'bg-slate-50/70' : ''}`}
                    >
                      {cellHasPartial(row.key, platform) && model.matrix[row.key][platform].state === 'known' && (
                        <span className="mr-1 align-middle text-[10px] font-bold uppercase text-amber-700">Partial coverage</span>
                      )}
                      <Cell cell={model.matrix[row.key][platform]} />
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-bold tabular-nums text-slate-900">
                    {model.matrix[row.key].Total.state !== 'known' && model.matrix[row.key].Total.state === 'unknown' && (
                      <span className="mr-1 align-middle text-[10px] font-bold uppercase text-amber-700">Partial known total</span>
                    )}
                    <Cell cell={model.matrix[row.key].Total} credit={false} />
                  </TableCell>
                </TableRow>

                {rateIndent && commissionRate && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell className={`${stickyCol} bg-slate-50/60 py-1.5 pl-7 text-xs italic whitespace-nowrap text-slate-500`}>
                      ↳ rate, % of net sales
                    </TableCell>
                    {FEE_PLATFORMS.map((platform) => {
                      const rate = model.platforms.find((entry) => entry.platform === platform)!.commissionRate
                      return (
                        <TableCell
                          key={platform}
                          className={`py-1.5 text-right text-xs italic tabular-nums text-slate-500 ${highlight === platform ? 'bg-slate-100/70' : 'bg-slate-50/60'}`}
                        >
                          {rate.state === 'known' ? rate.value : <span className="text-amber-700">Unavailable</span>}
                        </TableCell>
                      )
                    })}
                    <TableCell className="bg-slate-50/60 py-1.5 text-right text-xs italic tabular-nums text-slate-500">
                      <span className="text-amber-700">Unavailable</span>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            )
          })}
        </TableBody>

        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell className={`${stickyCol} bg-slate-50 whitespace-nowrap`}>Total fees</TableCell>
            {FEE_PLATFORMS.map((platform) => {
              const entry = model.platforms.find((item) => item.platform === platform)!
              return (
                <TableCell key={platform} className={`text-right tabular-nums ${highlight === platform ? 'bg-slate-100' : ''}`}>
                  <Cell cell={entry.total} />
                </TableCell>
              )
            })}
            <TableCell className="text-right tabular-nums text-[#C8102E]">
              <Cell cell={model.totals.totalFees} credit={false} />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

/* --------------------------- Composition cards ---------------------------- */

const CompositionCard: React.FC<{ entry: FeePlatformView }> = ({ entry }) => {
  const values = entry.cells
  const categories: { key: FeeCategoryKey; label: string; value: number }[] = FEE_CATEGORIES.map((category) => ({
    key: category.key,
    label: category.label,
    value: values[category.key].state === 'known' && values[category.key].value !== null ? Number(values[category.key].value) : 0,
  }))

  const totalKnown = entry.total.state === 'known' && entry.total.value !== null
  if (!totalKnown) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <PlatformLogo platform={entry.platform} size="sm" />
          {entry.platform}
        </div>
        <p className="mt-2 text-xs leading-5 text-amber-700">
          No composition bar: this platform's total is unavailable, so a split would invent category shares.
        </p>
      </div>
    )
  }

  const portions = categories.filter((item) => item.value !== 0)
  const magnitude = portions.reduce((sum, item) => sum + Math.abs(item.value), 0)

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <PlatformLogo platform={entry.platform} size="sm" />
          {entry.platform}
        </span>
        <span className="text-xs font-semibold tabular-nums text-slate-500">{formatDecimal(entry.total.value!)} fees</span>
      </div>
      <div
        className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={`${entry.platform} fee composition: ${portions.map((item) => `${item.label} ${Math.round((Math.abs(item.value) / magnitude) * 100)}%`).join(', ')}`}
      >
        {portions.map((item) => (
          <div key={item.key} style={{ width: `${(Math.abs(item.value) / magnitude) * 100}%`, background: FEE_TYPE_COLORS[item.key] }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        {portions.map((item) => (
          <span className="flex items-center gap-1 text-[11px] text-slate-600" key={item.key}>
            <span className="h-2 w-2 rounded-sm" style={{ background: FEE_TYPE_COLORS[item.key] }} aria-hidden="true" />
            {item.label} {Math.round((Math.abs(item.value) / magnitude) * 100)}%
          </span>
        ))}
      </div>
    </div>
  )
}

function CompositionLegend() {
  return (
    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500" aria-label="Fee category legend">
      {FEE_CATEGORIES.map((row) => (
        <span className="flex items-center gap-1.5" key={row.key}>
          <span className="h-2 w-2 rounded-sm" style={{ background: FEE_TYPE_COLORS[row.key] }} aria-hidden="true" />
          {row.label}
        </span>
      ))}
    </div>
  )
}

/* ----------------------------- Coverage note ------------------------------ */

function CoverageNote({ model, visible }: { model: FeesViewModel; visible: FeePlatformView[] }) {
  const blocking = model.coverageIncomplete
  return (
    <div className={`rounded-xl border px-4 py-3.5 ${blocking ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white shadow-xs'}`}>
      <div className="flex items-start gap-3">
        {blocking && <WarningTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />}
        <div>
          <h3 className={`text-sm font-bold ${blocking ? 'text-amber-950' : 'text-slate-900'}`}>Source & coverage notes</h3>
          <p className={`mt-0.5 text-xs ${blocking ? 'text-amber-900' : 'text-slate-500'}`}>{model.sourceNote}</p>
        </div>
      </div>
      <ul className="mt-3 space-y-2 text-sm text-slate-600">
        {visible.filter((entry) => !entry.absent).map((entry) => (
          <li key={entry.platform} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0"><PlatformLogo platform={entry.platform} size="xs" /></span>
            <span>
              <span className="font-semibold text-slate-800">{entry.platform}:</span> {entry.note}{' '}
              <span className="text-slate-500">
                {entry.coverage.rowCount.toLocaleString()} rows · {entry.coverage.dayCount} days · {entry.coverage.outletCount} outlets
                {entry.coverage.importedFrom ? ` · ${entry.coverage.importedFrom} → ${entry.coverage.importedTo}` : ''} ·{' '}
                <span className={entry.coverage.label === 'Complete' ? 'text-emerald-700' : 'text-amber-700'}>{entry.coverage.label}</span>
                {entry.coverage.unknownFieldCount > 0 ? ` · ${entry.coverage.unknownFieldCount} unknown money fields` : ''}
                {entry.coverage.unmappedRowCount > 0 ? ` · ${entry.coverage.unmappedRowCount} unmapped rows` : ''}
                {entry.coverage.sisterBrandExcludedCount > 0 ? ` · ${entry.coverage.sisterBrandExcludedCount} sister-brand rows excluded` : ''}
              </span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
        POS is a sales-coverage reference only and is never added to platform fee totals. Per-outlet fee drill-down is not yet available:
        the current imports store daily aggregate fees without outlet/day fee categories.
      </p>
    </div>
  )
}

/* ---------------------------- Reconciliation ------------------------------ */

function ReconciliationPanel({ model }: { model: FeesViewModel }) {
  const { reconciliation } = model
  if (reconciliation.kind === 'unavailable') {
    return (
      <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <WarningTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <p>
          <span className="font-semibold text-slate-800">Settlement reconciliation unavailable.</span> {reconciliation.note}
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <WarningTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
        <h3 className="text-sm font-bold text-amber-950">Settlement reconciliation · {model.period}</h3>
        <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-bold text-amber-800">Open difference</span>
      </div>
      <p className="mt-1.5 text-sm leading-5 text-amber-900">
        Fees reported by platforms and fees taken out of {model.period} settlements differ by{' '}
        <strong className="tabular-nums">{formatDecimal(reconciliation.difference)}</strong>. {reconciliation.note}
      </p>
      <dl className="mt-3 grid gap-2 border-t border-amber-200 pt-3 sm:grid-cols-3">
        <ReconFact label="Total fees reported" value={formatDecimal(reconciliation.reportedFees)} />
        <ReconFact label="Taken out of settlements" value={formatDecimal(reconciliation.settlementDeducted)} />
        <ReconFact label="Difference" value={formatDecimal(reconciliation.difference)} emphasis />
      </dl>
    </div>
  )
}

function ReconFact({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-800/80">{label}</dt>
      <dd className={`mt-0.5 text-base font-black tabular-nums ${emphasis ? 'text-amber-950' : 'text-slate-900'}`}>{value}</dd>
    </div>
  )
}
