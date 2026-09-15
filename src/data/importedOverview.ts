import { ENTITY_NAMES, PLATFORMS, PLATFORM_LABELS, type EntityScope, type OverviewAggregate, type PlatformAggregate } from './aggregate'
import { EMPTY_MAPPINGS, outletNameKey, resolveOutlet, type OutletMappings } from './outletMaster'

export type OverviewValues = { [K in Exclude<keyof OverviewAggregate, 'byPlatform'>]: number | null } & {
  byPlatform: Array<{ [K in keyof PlatformAggregate]: PlatformAggregate[K] extends number ? number | null : PlatformAggregate[K] }>
}
export interface ImportedRow {
  sales_date: string
  outlet_name: string
  source: string
  gross_sales: number | string
  discount: number | string
  net_sales: number | string
  tax: number | string
  service_charge: number | string
  payout: number | string
  record_count: number
}
const round = (n: number) => Math.round(n * 100) / 100
export const sumKnown = (values: Array<number | null>): number | null =>
  values.some(v => v === null) ? null : round(values.reduce<number>((total, value) => total + value!, 0))

export function importedOverview(rows: ImportedRow[], scope: EntityScope, mappings: OutletMappings = EMPTY_MAPPINGS) {
  const resolved = (r: ImportedRow) => resolveOutlet(r.source, r.outlet_name, mappings)
  const identity = (r: ImportedRow) => resolved(r)?.id ?? `unmapped:${r.source}:${outletNameKey(r.outlet_name)}`
  const branded = rows.filter(r => /^us pizza\b/i.test(r.outlet_name.trim()))
  const unmapped = [...new Set(branded.filter(r => !resolved(r)).map(r => r.outlet_name))].sort()
  const posUnmapped = new Set(branded.filter(r => r.source === 'pos' && !resolved(r)).map(identity)).size
  const scoped = branded.filter(r => scope === 'all' || resolved(r)?.entity === ENTITY_NAMES[scope])
  const pos = scoped.filter(r => r.source === 'pos')
  const sum = (input: ImportedRow[], key: keyof ImportedRow) => input.length ? round(input.reduce((total, row) => total + Number(row[key]), 0)) : null
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
    new Set(branded.filter(r => r.source === 'pos' && (key === 'all' || resolved(r)?.entity === ENTITY_NAMES[key as keyof typeof ENTITY_NAMES])).map(identity)).size,
  ])) as Record<EntityScope, number>
  const outlets = [...new Set(pos.map(identity))].map(id => {
    const group = pos.filter(r => identity(r) === id)
    return { id, name: resolved(group[0])?.name ?? `${group[0].outlet_name} (unmapped)`, net: sum(group, 'net_sales')! }
  }).sort((a, b) => a.name.localeCompare(b.name))
  const coverage = PLATFORMS.map(source => {
    const sourceRows = scoped.filter(r => r.source === source)
    return { source, records: sourceRows.reduce((n, r) => n + r.record_count, 0), days: new Set(sourceRows.map(r => r.sales_date)).size, outlets: new Set(sourceRows.map(identity)).size }
  })
  return { totals, counts, unmapped, posUnmapped, outlets, coverage }
}
