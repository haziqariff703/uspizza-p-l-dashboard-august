/**
 * Section 2 ("Commission & Fees Breakdown") view-model.
 *
 * One shape is consumed by one page component. The May demo builds it from
 * static figures (see `feesStaticAdapter.ts`); every live month builds it from
 * the imported daily rows (see `importedFees.ts`). Neither adapter is allowed to
 * fill an unknown with a zero, and no live month may borrow May's figures.
 */
import type { FieldState } from './importedFees'

export type { FieldState }

/** A nullable exact-decimal string. `null` means "not a known figure"; the
 *  accompanying `state` says whether that is `unknown` (applicable but not
 *  supplied) or `none` (no source rows at all). */
export type FeeCellValue = string | null

/** One money cell of the fee matrix. */
export interface FeeCell {
  value: FeeCellValue
  state: FieldState
}

export const feeCell = (value: FeeCellValue, state: FieldState): FeeCell => ({ value, state })

/** A cell with no source rows behind it. */
export const ABSENT_CELL: FeeCell = feeCell(null, 'none')
/** A cell whose source exists but did not supply the value. */
export const UNKNOWN_CELL: FeeCell = feeCell(null, 'unknown')
/** A cell whose value is a complete, exact decimal string (including "0"). */
export const knownCell = (value: string): FeeCell => feeCell(value, 'known')

/** Fee categories, in the original capture's order. Finance compares them
 *  month to month, so this order is part of the contract, not presentation. */
export const FEE_CATEGORIES = [
  { key: 'commission', label: 'Commission' },
  { key: 'advertising', label: 'Advertising' },
  { key: 'platformFees', label: 'Platform / service fees' },
  { key: 'paymentGateway', label: 'Payment gateway' },
  { key: 'adjustments', label: 'Adjustments / credits' },
] as const

export type FeeCategoryKey = (typeof FEE_CATEGORIES)[number]['key']

/** The four fee-bearing platforms plus the derived Total column. POS is
 *  deliberately absent: it is a sales-coverage reference, not a fee source. */
export const FEE_PLATFORMS = ['Grab', 'FoodPanda', 'Shopee', 'Apps'] as const
export type FeePlatformId = (typeof FEE_PLATFORMS)[number]
export type FeeColumnId = FeePlatformId | 'Total'

export type FeeCategoryMatrix = Record<FeeCategoryKey, Record<FeeColumnId, FeeCell>>

/** Which source-side platform a column is built from. */
export const FEE_SOURCE_IDS: Record<FeePlatformId, 'grab' | 'foodpanda' | 'shopee' | 'apps'> = {
  Grab: 'grab',
  FoodPanda: 'foodpanda',
  Shopee: 'shopee',
  Apps: 'apps',
}

export const PLATFORM_DISPLAY_NAMES: Record<'grab' | 'foodpanda' | 'shopee' | 'apps', FeePlatformId> = {
  grab: 'Grab',
  foodpanda: 'FoodPanda',
  shopee: 'Shopee',
  apps: 'Apps',
}

/** Coverage label a platform can honestly carry. Never a fabricated
 *  completion percentage; "Complete" must be Finance-sanctioned state, not an
 *  inference from a date range. */
export type FeeCoverageLabel = 'Complete' | 'Partial coverage' | 'Coverage not verified'

/** Per-platform coverage disclosure. Every count is derived from the loaded
 *  rows; a zero count is a real, observed zero rather than an absent value. */
export interface FeeCoverage {
  rowCount: number
  dayCount: number
  outletCount: number
  /** ISO `YYYY-MM-DD` bounds of the imported rows, or null when there are none. */
  importedFrom: string | null
  importedTo: string | null
  /** Applicable money cells that arrived NULL/unknown. */
  unknownFieldCount: number
  /** Rows whose outlet did not join a canonical outlet. */
  unmappedRowCount: number
  /** Rows excluded because they belong to a sister brand, not a corporate outlet. */
  sisterBrandExcludedCount: number
  label: FeeCoverageLabel
}

/** A derived commission rate is only valid when both the commission numerator
 *  and its Finance-approved net-sales denominator are known. Today only the
 *  denominator is persisted, so live rates stay unavailable. */
export interface FeeRate {
  value: string | null
  state: FieldState
}

/** One platform's column in the view-model. */
export interface FeePlatformView {
  platform: FeePlatformId
  /** Source id (`grab`, `foodpanda`, …) for notes and tests. */
  source: 'grab' | 'foodpanda' | 'shopee' | 'apps'
  cells: Record<FeeCategoryKey, FeeCell>
  /** Sum of the five categories, complete only when every applicable category
   *  is known. `partial` carries the known-only subtotal and is never a final
   *  corporate total. */
  total: FeeCell
  totalPartialValue: string | null
  commissionRate: FeeRate
  coverage: FeeCoverage
  /** Source-specific limitation, written once and rendered as a data note. */
  note: string
  /** True when the platform supplied no fee rows for the period at all. */
  absent: boolean
}

/** Which column the platform tabs currently focus. `all` renders every
 *  platform; a platform id highlights that column and its composition card. */
export type FeeSelection = 'all' | FeePlatformId

/** Settlement reconciliation is gated on evidence. `unavailable` is the only
 *  correct live state until a separately sourced bank settlement is imported. */
export type FeeReconciliation =
  | { kind: 'unavailable'; note: string }
  | {
      kind: 'open'
      reportedFees: string
      settlementDeducted: string
      difference: string
      note: string
    }

export interface FeesViewModel {
  /** Long display name for the selected reporting month, e.g. "May 2026". */
  period: string
  /** True when the entire period has no imported fee source at all. */
  empty: boolean
  /** True when at least one platform applied but left an applicable value unknown. */
  hasUnknown: boolean
  matrix: FeeCategoryMatrix
  platforms: FeePlatformView[]
  totals: {
    advertisingSpend: FeeCell
    commission: FeeCell
    totalFees: FeeCell
    /** Known-only subtotal behind a partial total, or null when not partial. */
    totalFeesPartialValue: string | null
  }
  reconciliation: FeeReconciliation
  /** One-line source/coverage limitation shown beneath the matrix. */
  sourceNote: string
  /** True when any platform carries `Partial coverage` or `Coverage not verified`. */
  coverageIncomplete: boolean
}
