import { ENTITY_NAMES, PLATFORMS, PLATFORM_LABELS, type EntityScope, type OverviewAggregate, type PlatformAggregate } from './aggregate'
import { AMOUNT_UNKNOWN, AMOUNT_ABSENT, amount, addAmounts, subtractAmounts, type Amount } from '../lib/decimal'

export type OverviewValues = { [K in Exclude<keyof OverviewAggregate, 'byPlatform'>]: number | null } & {
  byPlatform: Array<{ [K in keyof PlatformAggregate]: PlatformAggregate[K] extends number ? number | null : PlatformAggregate[K] }>
}
/** One outlet's five derived waterfall metrics, per platform. Values are the
 *  exact-decimal aggregation of the outlet's scoped rows; null = unknown. */
export interface OutletWaterfall {
  gross: number | null
  discount: number | null
  net: number | null
  netSC: number | null
  netSCTax: number | null
}
export interface OutletOverview {
  id: string
  name: string
  pos: OutletWaterfall
  grab: OutletWaterfall
  foodpanda: OutletWaterfall
  shopee: OutletWaterfall
  apps: OutletWaterfall
}
export interface ImportedRow {
  sales_date: string
  outlet_name: string
  source: string
  /** Set when the row arrives already joined to a canonical outlet. */
  outlet_id?: string | null
  /** Canonical outlet code, carried through from the join for display. */
  outlet_code: string | null
  entity?: string | null
  gross_sales: number | string | null
  discount: number | string | null
  net_sales: number | string | null
  tax: number | string | null
  service_charge: number | string | null
  platform_fees: number | string | null
  /** Selected for the row model only. Section 1 does not aggregate these. */
  advertising_spend: number | string | null
  payout: number | string | null
  commission?: number | string | null
  payment_gateway_fee?: number | string | null
  adjustments?: number | string | null
  total_deductions?: number | string | null
  record_count: number
}
const round = (n: number) => Math.round(n * 100) / 100
export const sumKnown = (values: Array<number | null>): number | null =>
  values.some(v => v === null) ? null : round(values.reduce<number>((total, value) => total + value!, 0))

export type DerivedField = 'serviceCharge' | 'tax'

/**
 * Charges the parser derives from a contractual rate because the export does
 * not state them on their own. A derived charge is a known figure, not
 * `Unavailable`, but it is not a reported one and Section 1 has to say so.
 * Kept here because it is a property of the source mapping, not of a day's data.
 */
export const DERIVED_CHARGES: ReadonlyMap<string, { fields: readonly DerivedField[]; note: string }> = new Map([
  ['shopee', {
    fields: ['tax'],
    note: 'Shopee states no tax column, so its SST is calculated at 6% inside the tax-inclusive transaction amount',
  }],
  ['apps', {
    fields: ['serviceCharge', 'tax'],
    note: 'The app states one combined charges column, split at the contractual 10% dine-in service charge and 6% SST',
  }],
])

/** Money fields that may be summed exactly for Section 1. */
type MoneyKey = 'gross_sales' | 'discount' | 'net_sales' | 'tax' | 'service_charge' | 'payout' | 'platform_fees' | 'commission' | 'payment_gateway_fee' | 'adjustments' | 'total_deductions'

export function importedOverview(rows: ImportedRow[], scope: EntityScope) {
  // Identity and entity come from the canonical outlet join alone. A row with no
  // `outlet_id` has no canonical outlet at all and is reported as a data-quality
  // gap; no name matching or alias guessing happens in live aggregation.
  const resolved = (r: ImportedRow) => r.outlet_id
    ? { id: r.outlet_id, name: r.outlet_name, entity: r.entity ?? null }
    : null
  const identity = (r: ImportedRow) => resolved(r)?.id ?? `unmapped:${r.source}:${r.outlet_name}`
  const scoped = rows.filter(r => scope === 'all' || resolved(r)?.entity === ENTITY_NAMES[scope])
  const unmapped = [...new Set(rows.filter(r => !resolved(r)).map(r => r.outlet_name))].sort()
  const posUnmapped = new Set(rows.filter(r => !resolved(r)).map(identity)).size
  const pos = scoped.filter(r => r.source === 'pos')

  // Exact decimal arithmetic: a null cell is unknown (the source did not state
  // the amount), never zero. An empty set contributes nothing at all.
  const toAmount = (cell: number | string | null | undefined): Amount =>
    cell === null || cell === undefined ? AMOUNT_UNKNOWN : amount(String(cell))
  const sumAmounts = (input: ImportedRow[], key: MoneyKey): Amount =>
    input.length ? addAmounts(...input.map(r => toAmount(r[key]))) : AMOUNT_ABSENT
  // An Amount becomes a displayed figure exactly once, at the boundary.
  const toNumber = (a: Amount): number | null => a.kind === 'value' ? Number(a.value) : null

  // POS is its own sales channel (POS-system sales), not an all-channel rollup.
  // The headline sums every source; a day with no order economics is excluded.
  const salesRows = scoped.filter(r => !(r.gross_sales === null && r.net_sales === null))
  const grossMenuA = sumAmounts(salesRows, 'gross_sales')
  const netA = sumAmounts(salesRows, 'net_sales')
  const discountA = subtractAmounts(grossMenuA, netA)
  const serviceChargeA = sumAmounts(salesRows, 'service_charge')
  const taxA = sumAmounts(salesRows, 'tax')
  const netSCA = addAmounts(netA, serviceChargeA)
  const netSCTaxA = addAmounts(netSCA, taxA)

  const byPlatform = PLATFORMS.map(platform => {
    // A day with no order economics (advertising-only, or a payout/adjustment
    // row) is not an order and must not poison the sales sum into unknown.
    const platformRows = scoped.filter(r => r.source === platform && !(
      r.gross_sales === null && r.net_sales === null
    ))
    // POS is its own sales channel (POS-system sales), summed like the others.
    const basisRows = platformRows
    // Older Grab imports copied tax-inclusive Net Sales into both sales bases
    // and retained negative promotion deductions. Do not present that copied
    // number as original menu price or pre-tax net until source reconciliation.
    const legacyGrab = platform === 'grab' && basisRows.some(r => r.discount !== null && Number(r.discount) < 0)
    const grossA = legacyGrab ? AMOUNT_UNKNOWN : sumAmounts(basisRows, 'gross_sales')
    const platformNetA = legacyGrab ? AMOUNT_UNKNOWN : sumAmounts(basisRows, 'net_sales')
    const scA = sumAmounts(basisRows, 'service_charge')
    const taxA = sumAmounts(basisRows, 'tax')
    const platformSCA = addAmounts(platformNetA, scA)
    const collectedA = addAmounts(platformSCA, taxA)
    const payoutA = sumAmounts(basisRows, 'payout')
    const reportedDiscountA = sumAmounts(basisRows, 'discount')
    const discountA = legacyGrab ? subtractAmounts(amount('0'), reportedDiscountA) : reportedDiscountA
    const deductionsA = subtractAmounts(collectedA, payoutA)
    const grossMenu = toNumber(grossA)
    const settlement = toNumber(payoutA)
    const keptPct = settlement !== null && grossMenu !== null && grossMenu > 0
      ? (settlement / grossMenu) * 100
      : null
    return {
      platform, label: PLATFORM_LABELS[platform],
      grossMenu,
      net: toNumber(platformNetA), netSC: toNumber(platformSCA), netSCTax: toNumber(collectedA),
      discount: toNumber(discountA.kind === 'value' ? discountA : subtractAmounts(grossA, platformNetA)),
      serviceCharge: toNumber(scA), tax: toNumber(taxA),
      settlement, commissionAndFees: toNumber(deductionsA.kind === 'value' ? deductionsA : sumAmounts(basisRows, 'total_deductions')), keptPct,
    }
  })

  const totals: OverviewValues = {
    outletCount: new Set(salesRows.map(identity)).size,
    grossMenu: toNumber(grossMenuA),
    net: toNumber(netA),
    discount: toNumber(discountA),
    serviceCharge: toNumber(serviceChargeA),
    tax: toNumber(taxA),
    netSC: toNumber(netSCA),
    netSCTax: toNumber(netSCTaxA),
    purchases: null, grossProfit: null, margin: null, commission: null, netAfterCommission: null,
    byPlatform,
  }
  const counts = Object.fromEntries(['all', 'myUsPizza', 'sabah'].map(key => [key,
    new Set(salesRows.filter(r => key === 'all' || resolved(r)?.entity === ENTITY_NAMES[key as keyof typeof ENTITY_NAMES]).map(identity)).size,
  ])) as Record<EntityScope, number>
  const outlets = [...new Set(salesRows.map(identity))].map(id => {
    const group = salesRows.filter(r => identity(r) === id)
    return { id, name: resolved(group[0])?.name ?? `${group[0].outlet_name} (unmapped)`, net: toNumber(sumAmounts(group, 'net_sales')) }
  }).sort((a, b) => a.name.localeCompare(b.name))
  const coverage = PLATFORMS.map(source => {
    const sourceRows = scoped.filter(r => r.source === source)
    return { source, records: sourceRows.reduce((n, r) => n + r.record_count, 0), days: new Set(sourceRows.map(r => r.sales_date)).size, outlets: new Set(sourceRows.map(identity)).size }
  })

  // Section 4 reads per-outlet, per-platform derived figures from here so it
  // never recomputes (and never collapses an unknown to zero). The derivation
  // mirrors the platform block above: discount = gross − net, net + SC, net + SC + SST.
  const byOutlet = [...new Set(scoped.map(identity))].map(id => {
    const group = scoped.filter(r => identity(r) === id)
    const name = resolved(group[0])?.name ?? `${group[0].outlet_name} (unmapped)`
    const platform = (source: string) => {
      // A day with no order economics (advertising-only or payout/adjustment)
      // is not an order; exclude it so it cannot poison the outlet sum.
      const rows = group.filter(r => r.source === source && !(
        r.gross_sales === null && r.net_sales === null
      ))
      const legacyGrab = source === 'grab' && rows.some(r => r.discount !== null && Number(r.discount) < 0)
      const grossA = legacyGrab ? AMOUNT_UNKNOWN : sumAmounts(rows, 'gross_sales')
      const netA = legacyGrab ? AMOUNT_UNKNOWN : sumAmounts(rows, 'net_sales')
      const scA = sumAmounts(rows, 'service_charge')
      const taxA = sumAmounts(rows, 'tax')
      const netSC = addAmounts(netA, scA)
      const netSCTax = addAmounts(netSC, taxA)
      const discountA = subtractAmounts(grossA, netA)
      return {
        gross: toNumber(grossA),
        discount: toNumber(discountA),
        net: toNumber(netA),
        netSC: toNumber(netSC),
        netSCTax: toNumber(netSCTax),
      }
    }
    return {
      id, name,
      pos: platform('pos'),
      grab: platform('grab'),
      foodpanda: platform('foodpanda'),
      shopee: platform('shopee'),
      apps: platform('apps'),
    }
  })

  return { totals, counts, unmapped, posUnmapped, outlets, coverage, byOutlet }
}
