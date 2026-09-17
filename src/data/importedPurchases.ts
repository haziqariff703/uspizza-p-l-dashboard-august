/** One `purchases_daily` row joined to its outlet, as the dashboard reads it. */
export interface PurchaseRow {
  purchase_date: string
  outlet_id: string
  outlet_name: string
  entity: string | null
  purchase_amount: number | string | null
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
