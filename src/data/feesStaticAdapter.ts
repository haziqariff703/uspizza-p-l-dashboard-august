/**
 * May 2026 static adapter for Section 2.
 *
 * The demo figures in `COMMISSION_FEES_SUMMARY` / `PLATFORM_SETTLEMENTS` are
 * the only place May numbers may enter the view-model. This adapter is called
 * exclusively for the May sample path; live periods must use `importedFees`
 * so a demo figure can never appear under a live month heading.
 */
import { addAmounts, amount } from '../lib/decimal'
import { COMMISSION_FEES_SUMMARY, PLATFORM_SETTLEMENTS } from './outletData'
import {
  ABSENT_CELL,
  FEE_CATEGORIES,
  FEE_PLATFORMS,
  FEE_SOURCE_IDS,
  knownCell,
  type FeeCategoryKey,
  type FeeCell,
  type FeeColumnId,
  type FeePlatformId,
  type FeePlatformView,
  type FeeRate,
  type FeesViewModel,
} from './feesViewModel'

const MAY_PERIOD = 'May 2026'

type StaticPlatform = (typeof COMMISSION_FEES_SUMMARY.platforms)['Grab']

/** Demo coverage: the capture is a complete May figure set, so the demo label
 *  is `Complete` on purpose. It must never be reused for a live month. */
const staticCoverage = (outlets: number) => ({
  rowCount: outlets,
  dayCount: 31,
  outletCount: outlets,
  importedFrom: '2026-05-01',
  importedTo: '2026-05-31',
  unknownFieldCount: 0,
  unmappedRowCount: 0,
  sisterBrandExcludedCount: 0,
  label: 'Complete' as const,
})

const staticNote = (platform: FeePlatformId): string => {
  switch (platform) {
    case 'Grab':
      return 'May demo figures: Grab statement totals as captured. '
    case 'FoodPanda':
      return 'May demo figures: FoodPanda statement totals as captured. Negative adjustments are vendor credits.'
    case 'Shopee':
      return 'May demo figures: Shopee statement totals as captured. Live imports do not supply these values.'
    case 'Apps':
      return 'May demo figures: App gateway charges as captured.'
  }
}

const rateCell = (rate: string): FeeRate =>
  rate === '—' || rate === '-' ? { value: null, state: 'none' } : { value: rate, state: 'known' }

const cellFrom = (value: number): FeeCell => knownCell(String(value))

const platformView = (platform: FeePlatformId, outlets: number): FeePlatformView => {
  const fees: StaticPlatform = COMMISSION_FEES_SUMMARY.platforms[platform]
  const cells = {
    commission: cellFrom(fees.commission),
    advertising: cellFrom(fees.advertising),
    platformFees: cellFrom(fees.platformFees),
    paymentGateway: cellFrom(fees.paymentGateway),
    adjustments: cellFrom(fees.adjustments),
  } satisfies Record<FeeCategoryKey, FeeCell>
  return {
    platform,
    source: FEE_SOURCE_IDS[platform],
    cells,
    total: cellFrom(fees.totalFees),
    totalPartialValue: null,
    commissionRate: rateCell(fees.rate),
    coverage: staticCoverage(outlets),
    note: staticNote(platform),
    absent: false,
  }
}

/** Demo reconciliation: `totalFeesMonth` is the platform statement side and
 *  `PLATFORM_SETTLEMENTS.commissionFees` is what left the settlements, so both
 *  sides of the evidence gate genuinely exist for May. */
function staticReconciliation(): FeesViewModel['reconciliation'] {
  const deducted = PLATFORM_SETTLEMENTS.reduce((sum, entry) => sum + entry.commissionFees, 0)
  const reported = COMMISSION_FEES_SUMMARY.totalFeesMonth
  const difference = reported - deducted
  if (difference === 0) return { kind: 'unavailable', note: 'Platform statements and settlements agree for May 2026.' }
  return {
    kind: 'open',
    reportedFees: String(reported),
    settlementDeducted: String(deducted),
    difference: String(difference),
    note: 'May 2026 platform statements and settlement deductions use different date bases; the gap stays open until invoices are matched.',
  }
}

/**
 * Builds the Section 2 view-model from the May demo figures only.
 * @param outletCount demo outlet coverage shown in the disclosure (defaults to
 *   the demo capture's 44 trading outlets).
 */
export function mayFeesViewModel(outletCount = 44): FeesViewModel {
  const platforms = FEE_PLATFORMS.map((platform) => platformView(platform, outletCount))

  const matrix = {} as FeesViewModel['matrix']
  for (const { key } of FEE_CATEGORIES) {
    const row = {} as Record<FeeColumnId, FeeCell>
    for (const platform of FEE_PLATFORMS) {
      row[platform] = platforms.find((entry) => entry.platform === platform)!.cells[key]
    }
    const totalValue = COMMISSION_FEES_SUMMARY.platforms.Total[key]
    row.Total = cellFrom(totalValue)
    matrix[key] = row
  }

  return {
    period: MAY_PERIOD,
    empty: false,
    hasUnknown: false,
    matrix,
    platforms,
    totals: {
      advertisingSpend: cellFrom(COMMISSION_FEES_SUMMARY.advertisingSpend),
      commission: cellFrom(COMMISSION_FEES_SUMMARY.commissionMonth),
      totalFees: cellFrom(COMMISSION_FEES_SUMMARY.totalFeesMonth),
      totalFeesPartialValue: null,
    },
    reconciliation: staticReconciliation(),
    sourceNote: `${MAY_PERIOD} delivery-partner settlement reports (sample). Advertising covers Grab ad charges and FoodPanda display placement. Adjustments shown in green are credits paid back to the company. POS is a sales-coverage reference and is excluded from fee totals.`,
    coverageIncomplete: false,
  }
}

/** Kept next to the adapter so the May-only gate is explicit at every call. */
export const MAY_REPORTING_MONTH = '2026-05'

/** Guards the May adapter against being reused for a live month. */
export function isMayMonth(reportingMonth: string): boolean {
  return reportingMonth === MAY_REPORTING_MONTH
}

/** Decimal sum used only by tests to prove the static totals are exact. */
export const staticCategoryTotal = (key: FeeCategoryKey): string => {
  const parts = FEE_PLATFORMS.map((platform) => amount(String(COMMISSION_FEES_SUMMARY.platforms[platform][key])))
  const total = addAmounts(...parts)
  return total.kind === 'value' ? total.value : '0'
}

export { ABSENT_CELL }
