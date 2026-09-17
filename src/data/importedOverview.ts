import { ENTITY_NAMES, PLATFORMS, PLATFORM_LABELS, type EntityScope, type OverviewAggregate, type PlatformAggregate } from './aggregate'
import { EMPTY_MAPPINGS, isSisterBrand, outletNameKey, resolveOutlet, type OutletMappings } from './outletMaster'

export type OverviewValues = { [K in Exclude<keyof OverviewAggregate, 'byPlatform'>]: number | null } & {
  byPlatform: Array<{ [K in keyof PlatformAggregate]: PlatformAggregate[K] extends number ? number | null : PlatformAggregate[K] }>
}
export interface ImportedRow {
  sales_date: string
  outlet_name: string
  source: string
  gross_sales: number | string | null
  discount: number | string | null
  net_sales: number | string | null
  tax: number | string | null
  service_charge: number | string | null
  payout: number | string | null
  record_count: number
}
const round = (n: number) => Math.round(n * 100) / 100
export const sumKnown = (values: Array<number | null>): number | null =>
  values.some(v => v === null) ? null : round(values.reduce<number>((total, value) => total + value!, 0))

export function importedOverview(rows: ImportedRow[], scope: EntityScope, mappings: OutletMappings = EMPTY_MAPPINGS) {
  const resolved = (r: ImportedRow) => resolveOutlet(r.source, r.outlet_name, mappings)
  const identity = (r: ImportedRow) => resolved(r)?.id ?? `unmapped:${r.source}:${outletNameKey(r.outlet_name)}`
  // Sister brands are excluded; every other name stays in, mapped or not.
  const ownBrand = rows.filter(r => !isSisterBrand(r.outlet_name))
  const unmapped = [...new Set(ownBrand.filter(r => !resolved(r)).map(r => r.outlet_name))].sort()
  const posUnmapped = new Set(ownBrand.filter(r => r.source === 'pos' && !resolved(r)).map(identity)).size
  const scoped = ownBrand.filter(r => scope === 'all' || resolved(r)?.entity === ENTITY_NAMES[scope])
  const pos = scoped.filter(r => r.source === 'pos')
  // A value the source never provided is unknown, so the total is unknown too.
  const sum = (input: ImportedRow[], key: keyof ImportedRow) =>
    !input.length || input.some(row => row[key] === null) ? null
      : round(input.reduce((total, row) => total + Number(row[key]), 0))
  const net = sum(pos, 'net_sales')
  const serviceCharge = sum(pos, 'service_charge')
  const tax = sum(pos, 'tax')
  const netSC = sumKnown([net, serviceCharge])
  const totals: OverviewValues = {
    outletCount: new Set(pos.map(identity)).size,
    grossMenu: sum(pos, 'gross_sales'), net, discount: sum(pos, 'discount'),
    serviceCharge, tax, netSC, netSCTax: sumKnown([netSC, tax]),
    purchases: null, grossProfit: null, margin: null, commission: null, netAfterCommission: null,
    byPlatform: PLATFORMS.map(platform => ({
      platform, label: PLATFORM_LABELS[platform],
      // POS includes every channel. It cannot populate the POS-only column.
      // Shopee gross is explicit; its Earnings is not verified net-of-tax or settlement.
      grossMenu: platform === 'shopee' ? sum(scoped.filter(r => r.source === platform), 'gross_sales') : null,
      net: null, netSC: null, netSCTax: null, discount: null, serviceCharge: null,
      tax: null, settlement: null, commissionAndFees: null, keptPct: null,
    })),
  }
  const counts = Object.fromEntries(['all', 'myUsPizza', 'sabah'].map(key => [key,
    new Set(ownBrand.filter(r => r.source === 'pos' && (key === 'all' || resolved(r)?.entity === ENTITY_NAMES[key as keyof typeof ENTITY_NAMES])).map(identity)).size,
  ])) as Record<EntityScope, number>
  const outlets = [...new Set(pos.map(identity))].map(id => {
    const group = pos.filter(r => identity(r) === id)
    return { id, name: resolved(group[0])?.name ?? `${group[0].outlet_name} (unmapped)`, net: sum(group, 'net_sales') }
  }).sort((a, b) => a.name.localeCompare(b.name))
  const coverage = PLATFORMS.map(source => {
    const sourceRows = scoped.filter(r => r.source === source)
    return { source, records: sourceRows.reduce((n, r) => n + r.record_count, 0), days: new Set(sourceRows.map(r => r.sales_date)).size, outlets: new Set(sourceRows.map(identity)).size }
  })
  return { totals, counts, unmapped, posUnmapped, outlets, coverage }
}
