import { addAmounts, amount, AMOUNT_ABSENT, AMOUNT_UNKNOWN, type Amount } from '../lib/decimal'
import { ENTITY_NAMES, type EntityScope } from './aggregate'
import type { ChannelFilter } from '../types'
import type { ImportedRow } from './importedOverview'
import {
  ABSENT_CELL,
  FEE_CATEGORIES,
  FEE_PLATFORMS,
  FEE_SOURCE_IDS,
  knownCell,
  UNKNOWN_CELL,
  type FeeCategoryKey,
  type FeeCell,
  type FeeColumnId,
  type FeeCoverage,
  type FeeCoverageLabel,
  type FeePlatformId,
  type FeePlatformView,
  type FeesViewModel,
} from './feesViewModel'

const SOURCES = ['grab', 'foodpanda', 'shopee', 'apps', 'pos'] as const
export type FeeSource = (typeof SOURCES)[number]

/**
 * Three states a source/field can be in, per the Section 2 plan:
 *  - `none`    no rows imported for the source — nothing can be said at all;
 *  - `unknown` rows exist but one or more applicable values were not supplied;
 *  - `known`   a complete aggregate over every applicable value the source gave.
 *
 * A value is only `known` when every applicable cell supplied a real amount.
 * `none` is unavailable, never RM0; `unknown` is unavailable, never a partial
 * sum passed off as a total.
 */
export type FieldState = 'none' | 'unknown' | 'known'

/** A nullable exact-decimal string, or null when the aggregate is not `known`. */
export type KnownAmount = string | null

export interface ImportedFeePlatform {
  source: FeeSource
  /** Imported source rows (already entity/channel scoped by the caller). */
  rowCount: number
  /** Distinct sales dates those rows cover. */
  dayCount: number
  /** Distinct canonical outlets (or `unmapped:<source>:<name>` identities). */
  outletCount: number
  platformFees: KnownAmount
  platformFeesState: FieldState
  advertisingSpend: KnownAmount
  advertisingSpendState: FieldState
  payout: KnownAmount
  payoutState: FieldState
  /** platformFees + advertisingSpend only when both are `known`; else null. */
  knownCosts: KnownAmount
  knownCostsState: FieldState
  /** Source-specific limitation, written once and rendered as a data note. */
  note: string
}

/** A whole-platform/whole-month total is unavailable unless every applicable
 *  value is known. A partial subtotal may be labelled separately. */
export interface ImportedFeeSummary {
  platforms: ImportedFeePlatform[]
  /** Known total costs over sources whose `knownCosts` is `known`. */
  knownTotalCosts: KnownAmount
  /** Partial subtotal of known costs only (ignores unknown sources). */
  partialKnownCosts: KnownAmount
  /** True when any source that has rows is `unknown`, making the whole total
   *  unavailable and forcing the partial subtotal to be labelled partial. */
  hasUnknown: boolean
  /** True when no source has any rows at all. */
  empty: boolean
}

const SOURCE_NOTES: Record<FeeSource, string> = {
  grab: 'Combined deductions available; itemized commission requires persisted source detail.',
  foodpanda: 'Combined deductions only for loaded Excel-detail invoices; PDF-only invoices remain outside this total.',
  shopee: 'Fees and payout are not supplied by the current export; nothing is derived from it.',
  apps: 'No gateway fee or payout source is supplied; delivery fee is not a gateway fee.',
  pos: 'Sales-only report; excluded from platform-fee and payout totals.',
}

const sourceForFilter = (filter: ChannelFilter): FeeSource | null =>
  filter === 'All' ? null : (filter.toLowerCase() as FeeSource)

/** One field's three-state aggregate. A null/undefined cell is `unknown` (the
 *  field applies but was not supplied); an empty set is `none`. */
function sumField(rows: ImportedRow[], field: 'platform_fees' | 'advertising_spend' | 'payout'): { value: KnownAmount; state: FieldState } {
  if (!rows.length) return { value: null, state: 'none' }
  const values: Amount[] = rows.map(row => {
    const value = row[field]
    return value === null || value === undefined ? AMOUNT_UNKNOWN : amount(String(value))
  })
  const total = addAmounts(...values)
  if (total.kind !== 'value') return { value: null, state: 'unknown' }
  return { value: total.value, state: 'known' }
}

const identity = (row: ImportedRow): string =>
  row.outlet_id ? row.outlet_id : `unmapped:${row.source}:${row.outlet_name}`

/** Live fee figures only. NULL is unknown/absent and must never become RM0. */
export function importedFees(
  rows: ImportedRow[],
  channelFilter: ChannelFilter,
  scope: EntityScope = 'all',
): ImportedFeeSummary {
  const selected = sourceForFilter(channelFilter)
  const scoped = rows.filter(row => scope === 'all' || row.entity === ENTITY_NAMES[scope])

  const platforms: ImportedFeePlatform[] = SOURCES
    .filter(source => !selected || source === selected)
    .map(source => {
      const sourceRows = scoped.filter(row => row.source === source)
      const platformFees = sumField(sourceRows, 'platform_fees')
      const advertisingSpend = sumField(sourceRows, 'advertising_spend')
      const payout = sumField(sourceRows, 'payout')
      const knownCosts = platformFees.state === 'known' && advertisingSpend.state === 'known'
        ? addAmounts(amount(platformFees.value!), amount(advertisingSpend.value!))
        : (platformFees.state === 'unknown' || advertisingSpend.state === 'unknown' ? AMOUNT_UNKNOWN : AMOUNT_ABSENT)
      const knownCostsState: FieldState = knownCosts.kind === 'value'
        ? 'known'
        : (platformFees.state === 'unknown' || advertisingSpend.state === 'unknown' ? 'unknown' : 'none')
      return {
        source,
        rowCount: sourceRows.length,
        dayCount: new Set(sourceRows.map(row => row.sales_date)).size,
        outletCount: new Set(sourceRows.map(identity)).size,
        platformFees: platformFees.value,
        platformFeesState: platformFees.state,
        advertisingSpend: advertisingSpend.value,
        advertisingSpendState: advertisingSpend.state,
        payout: payout.value,
        payoutState: payout.state,
        knownCosts: knownCosts.kind === 'value' ? knownCosts.value : null,
        knownCostsState,
        note: SOURCE_NOTES[source],
      }
    })

  const knownCostValues = platforms
    .map(p => p.knownCosts)
    .filter((value): value is string => value !== null)
  const hasUnknown = platforms.some(p => p.knownCostsState === 'unknown')
  // A partial subtotal is only meaningful when some cost is actually known.
  const partial = knownCostValues.length ? addAmounts(...knownCostValues.map(value => amount(value))) : AMOUNT_ABSENT
  const partialKnownCosts = partial.kind === 'value' ? partial.value : null
  const knownTotalCosts = hasUnknown ? null : partialKnownCosts
  const empty = platforms.every(p => p.rowCount === 0)

  return { platforms, knownTotalCosts, partialKnownCosts, hasUnknown, empty }
}

/* -------------------------------------------------------------------------- */
/*  Section 2 view-model (live adapter)                                        */
/* -------------------------------------------------------------------------- */

/** The daily aggregate rows persist only `platform_fees`, `advertising_spend`
 *  and `payout`. Commission, payment-gateway fees and signed adjustments are
 *  not stored separately, so their live cells can never be `known`. */
const LIVE_NOTES: Record<FeePlatformId, string> = {
  Grab: 'Combined deductions available; itemized commission, gateway and signed adjustments require persisted source detail. Advertising counts every explicit advertising row; Grab Advertisement-category classification is not persisted yet.',
  FoodPanda: 'Combined deductions only for loaded Excel-detail invoices; PDF-only invoices remain outside this total. Customer-targeting fees are not classified as advertising until Finance confirms the definition.',
  Shopee: 'Shopee exports carry no separate fee or remittance field, so fees, payout, gateway and adjustments stay unavailable. Nothing is derived from Transaction Amount minus Earnings.',
  Apps: 'No gateway/remittance source is imported; delivery fee and Razerpay payment method are not gateway-fee evidence.',
}

const LIVE_SOURCE_NOTE =
  'Live imported daily fields only. Platform / service fees are combined deductions, not the original itemized categories. POS is a sales-coverage reference and is excluded from fee totals. Sister-brand and unmapped rows are excluded and counted in the coverage disclosure.'

/** Reports loaded for the month that are not complete imports. Retained in the
 *  view-model for the coverage disclosure even though the fetcher only loads
 *  `imported` rows. */
export interface FailedImport {
  source: string
  status: string
}

/** `null` field values that were applicable. A row with no advertising/Platform
 *  contribution at all (e.g. a POS row) is not counted. */
function unknownFieldCount(rows: ImportedRow[]): number {
  let count = 0
  for (const row of rows) {
    if (row.platform_fees === null || row.platform_fees === undefined) count += 1
    if (row.advertising_spend === null || row.advertising_spend === undefined) count += 1
  }
  return count
}

const dateBounds = (rows: ImportedRow[]): { importedFrom: string | null; importedTo: string | null } => {
  if (!rows.length) return { importedFrom: null, importedTo: null }
  const dates = rows.map(row => row.sales_date).sort()
  return { importedFrom: dates[0], importedTo: dates[dates.length - 1] }
}

function coverageFor(rows: ImportedRow[], label: FeeCoverageLabel): FeeCoverage {
  return {
    rowCount: rows.length,
    dayCount: new Set(rows.map(row => row.sales_date)).size,
    outletCount: new Set(rows.map(identity)).size,
    ...dateBounds(rows),
    unknownFieldCount: unknownFieldCount(rows),
    unmappedRowCount: rows.filter(row => !row.outlet_id).length,
    sisterBrandExcludedCount: 0,
    label,
  }
}

const toCell = (field: { value: KnownAmount; state: FieldState }): FeeCell => ({ value: field.value, state: field.state })

/**
 * Builds the Section 2 view-model from live imported rows.
 *
 * @param rows loaded `sales_daily` rows (already joined to canonical outlets).
 * @param channelFilter navbar channel filter, applied before aggregation.
 * @param scope entity scope, applied before aggregation.
 * @param period long month/year display label.
 * @param siblingsExcluded rows dropped upstream because they belong to a sister
 *   brand; surfaced in coverage rather than silently hidden.
 * @param failedImports draft/failed reports for the month; a failed file is a
 *   coverage state, not an absence.
 */
export function importedFeesViewModel(
  rows: ImportedRow[],
  channelFilter: ChannelFilter,
  scope: EntityScope,
  period: string,
  siblingsExcluded = 0,
  failedImports: FailedImport[] = [],
): FeesViewModel {
  const selected = sourceForFilter(channelFilter)
  const scoped = rows.filter(row => scope === 'all' || row.entity === ENTITY_NAMES[scope])

  const platforms: FeePlatformView[] = FEE_PLATFORMS.map(platform => {
    const source = FEE_SOURCE_IDS[platform]
    // Channel filter is applied before aggregation: a channel outside the
    // selection has no rows, so its cells are `none` (Not supplied), not zero.
    const sourceRows = selected && source !== selected ? [] : scoped.filter(row => row.source === source)
    const platformFees = toCell(sumField(sourceRows, 'platform_fees'))
    const advertising = toCell(sumField(sourceRows, 'advertising_spend'))

    // Commission, payment gateway and adjustments are not persisted, so their
    // state follows the source itself: no rows -> `none`, rows -> `unknown`.
    const structuralState: FieldState = sourceRows.length ? 'unknown' : 'none'
    const structuralCell = (): FeeCell => (structuralState === 'none' ? ABSENT_CELL : UNKNOWN_CELL)

    const cells: Record<FeeCategoryKey, FeeCell> = {
      commission: structuralCell(),
      advertising,
      platformFees,
      paymentGateway: structuralCell(),
      adjustments: structuralCell(),
    }

    // A complete total requires every category whose source is present to be
    // known. Today only platformFees + advertising can be known, and the other
    // three are `unknown` whenever rows exist — so the total is never complete
    // for a platform with live rows.
    const applicable: FeeCell[] = [cells.commission, cells.advertising, cells.platformFees, cells.paymentGateway, cells.adjustments]
    const anyUnknown = applicable.some(cell => cell.state === 'unknown')
    const valueCells = applicable.filter((cell): cell is FeeCell & { value: string } => cell.state === 'known' && cell.value !== null)
    const partialSum = valueCells.length
      ? addAmounts(...valueCells.map(cell => amount(cell.value)))
      : AMOUNT_ABSENT
    const total: FeeCell = anyUnknown
      ? UNKNOWN_CELL
      : partialSum.kind === 'value'
        ? knownCell(partialSum.value)
        : ABSENT_CELL

    const failedForSource = failedImports.filter(entry => entry.source === source)
    const label: FeeCoverageLabel =
      failedForSource.length > 0 ? 'Coverage not verified' : sourceRows.length ? 'Partial coverage' : 'Coverage not verified'
    const coverage = coverageFor(sourceRows, label)
    coverage.sisterBrandExcludedCount = siblingsExcluded

    return {
      platform,
      source,
      cells,
      total,
      totalPartialValue: total.state === 'unknown' && partialSum.kind === 'value' ? partialSum.value : null,
      // No persisted denominator means no valid live rate. Never divide an
      // unknown commission by an assumed net-sales figure.
      commissionRate: { value: null, state: 'none' },
      coverage,
      note: LIVE_NOTES[platform],
      absent: sourceRows.length === 0,
    }
  })

  const matrix = {} as FeesViewModel['matrix']
  for (const { key } of FEE_CATEGORIES) {
    const row = {} as Record<FeeColumnId, FeeCell>
    for (const platform of FEE_PLATFORMS) {
      row[platform] = platforms.find(entry => entry.platform === platform)!.cells[key]
    }
    const columnCells = FEE_PLATFORMS.map(platform => row[platform])
    const allKnown = columnCells.every(cell => cell.state === 'known' && cell.value !== null)
    if (allKnown) {
      const sum = addAmounts(...columnCells.map(cell => amount(cell.value!)))
      row.Total = sum.kind === 'value' ? knownCell(sum.value) : UNKNOWN_CELL
    } else {
      row.Total = UNKNOWN_CELL
    }
    matrix[key] = row
  }

  // KPI totals: advertising and fees sum only across known platform totals.
  const advertisingCells = platforms.map(entry => entry.cells.advertising)
  const advertisingKnown = advertisingCells.every(cell => cell.state === 'known' && cell.value !== null)
  const advertisingSum = advertisingCells.every(cell => cell.value !== null)
    ? addAmounts(...advertisingCells.map(cell => amount(cell.value!)))
    : AMOUNT_UNKNOWN
  const advertisingSpend: FeeCell = advertisingKnown && advertisingSum.kind === 'value'
    ? knownCell(advertisingSum.value)
    : advertisingCells.every(cell => cell.state === 'none')
      ? ABSENT_CELL
      : UNKNOWN_CELL

  const totalCells = platforms.map(entry => entry.total)
  const totalKnown = totalCells.every(cell => cell.state === 'known' && cell.value !== null)
  const totalPartialValues = platforms
    .map(entry => entry.totalPartialValue)
    .filter((value): value is string => value !== null)
  const totalPartial = totalPartialValues.length
    ? addAmounts(...totalPartialValues.map(value => amount(value)))
    : AMOUNT_ABSENT
  let totalFees: FeeCell
  if (totalKnown) {
    const sum = addAmounts(...totalCells.map(cell => amount(cell.value!)))
    totalFees = sum.kind === 'value' ? knownCell(sum.value) : UNKNOWN_CELL
  } else if (totalCells.every(cell => cell.state === 'none')) {
    totalFees = ABSENT_CELL
  } else {
    totalFees = UNKNOWN_CELL
  }

  const empty = platforms.every(entry => entry.absent)
  const hasUnknown = platforms.some(entry => !entry.absent && [
    entry.cells.commission,
    entry.cells.advertising,
    entry.cells.platformFees,
    entry.cells.paymentGateway,
    entry.cells.adjustments,
  ].some(cell => cell.state === 'unknown'))
  const coverageIncomplete = platforms.some(entry => entry.coverage.label !== 'Complete')

  return {
    period,
    empty,
    hasUnknown,
    matrix,
    platforms,
    totals: {
      advertisingSpend,
      // Commission is not persisted separately, so the live KPI is unavailable.
      commission: UNKNOWN_CELL,
      totalFees,
      totalFeesPartialValue: totalFees.state === 'unknown' && totalPartial.kind === 'value' ? totalPartial.value : null,
    },
    reconciliation: {
      kind: 'unavailable',
      note: `Settlement reconciliation unavailable for ${period}. No separately sourced bank settlement or payment-gateway statement is imported, so no difference is calculated. Platform-reported payouts are not bank-reconciled money.`,
    },
    sourceNote: LIVE_SOURCE_NOTE,
    coverageIncomplete,
  }
}
