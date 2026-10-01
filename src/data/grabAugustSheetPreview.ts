import type { EntityScope } from './aggregate'

/** Cent-exact extraction from datasource/GRAB_Aug_sales.xlsx Sheet1.
 * Recheck with `node ./node_modules/tsx/dist/cli.mjs scripts/extract_grab_august_fees.mts`.
 * The source file has 45 mapped outlets (44 MY, 1 Sabah), not complete coverage.
 * Commission includes Payment-row fee tax. Advertising includes its own tax once.
 * Gateway and adjustments are unknown; these figures are not a published total. */
export const GRAB_AUGUST_SHEET_PREVIEW: Record<EntityScope, {
  commission: string
  advertising: string
  platformFees: string
  knownSubtotal: string
  outletCount: number
}> = {
  all: { commission: '396982.47', advertising: '109727.28', platformFees: '15764.40', knownSubtotal: '522474.15', outletCount: 45 },
  myUsPizza: { commission: '385669.29', advertising: '105927.63', platformFees: '15403.51', knownSubtotal: '507000.43', outletCount: 44 },
  sabah: { commission: '11313.18', advertising: '3799.65', platformFees: '360.89', knownSubtotal: '15473.72', outletCount: 1 },
}
