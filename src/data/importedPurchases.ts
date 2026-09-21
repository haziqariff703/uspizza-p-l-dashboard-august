/** One `purchases_daily` row joined to its outlet, as the dashboard reads it. */
export interface PurchaseRow {
  purchase_date: string
  outlet_id: string
  outlet_name: string
  entity: string | null
  purchase_amount: number | string | null
}

export interface GRNPurchaseTotal {
  outlet_id: string
  outlet_name: string
  outlet_code: string
  outlet_entity: string | null
  total_purchase: number | string | null
}

export function purchaseRowFromGRN(row: GRNPurchaseTotal, month: string): PurchaseRow {
  if (!row.outlet_id || !row.outlet_name) throw new Error('GRN purchase response is missing its canonical outlet identity.')
  return { purchase_date: month, outlet_id: row.outlet_id, outlet_name: row.outlet_name,
    entity: row.outlet_entity, purchase_amount: row.total_purchase }
}

/** Maps the simple-schema join without requiring legacy GRN branch fields. */
export function purchaseRowFromJoined(row: {
  purchase_date: string
  outlet_id: string
  purchase_amount: PurchaseRow['purchase_amount']
  outlets?: { name: string; entity: string | null } | null
}): PurchaseRow {
  return {
    purchase_date: row.purchase_date,
    outlet_id: row.outlet_id,
    outlet_name: row.outlets?.name ?? 'Unnamed outlet',
    entity: row.outlets?.entity ?? null,
    purchase_amount: row.purchase_amount,
  }
}

export function matchedProfitability(rows: OutletProfit[]) {
  const matched = rows.filter(row => row.net !== null && row.purchases !== null)
  const net = matched.length ? round(matched.reduce((sum, row) => sum + row.net!, 0)) : null
  const purchases = matched.length ? round(matched.reduce((sum, row) => sum + row.purchases!, 0)) : null
  const grossProfit = net !== null && purchases !== null ? round(net - purchases) : null
  const margin = grossProfit !== null && net !== null && net !== 0 ? grossProfit / net * 100 : null
  return { net, purchases, grossProfit, margin, matchedCount: matched.length, excludedCount: rows.length - matched.length }
}

export interface OutletProfit {
  id: string
  name: string
  net: number | null
  purchases: number | null
  grossProfit: number | null
  margin: number | null
}

const round = (n: number) => Math.round(n * 100) / 100

/**
 * Joins imported net sales to imported purchases, per outlet.
 *
 * Both inputs are already scoped by the caller. A figure the source never
 * supplied stays null all the way through: an outlet with no purchases has no
 * gross profit and no margin, and is never shown as RM 0 or 0%.
 */
export function outletProfitability(
  salesOutlets: Array<{ id: string; name: string; net: number | null }>,
  purchases: PurchaseRow[],
): OutletProfit[] {
  const byOutlet = new Map<string, PurchaseRow[]>()
  for (const row of purchases) byOutlet.set(row.outlet_id, [...(byOutlet.get(row.outlet_id) ?? []), row])

  const names = new Map(salesOutlets.map(outlet => [outlet.id, outlet.name]))
  for (const [id, rows] of byOutlet) if (!names.has(id)) names.set(id, rows[0].outlet_name)

  return [...names].map(([id, name]) => {
    const net = salesOutlets.find(outlet => outlet.id === id)?.net ?? null
    const rows = byOutlet.get(id)
    const purchaseTotal = !rows?.length || rows.some(row => row.purchase_amount === null)
      ? null
      : round(rows.reduce((total, row) => total + Number(row.purchase_amount), 0))
    const grossProfit = net === null || purchaseTotal === null ? null : round(net - purchaseTotal)
    return {
      id,
      name,
      net,
      purchases: purchaseTotal,
      grossProfit,
      // A margin needs a net sales figure to divide by; zero net sales has none.
      margin: grossProfit === null || net === null || net === 0 ? null : round((grossProfit / net) * 100),
    }
  }).sort((a, b) => a.name.localeCompare(b.name))
}
