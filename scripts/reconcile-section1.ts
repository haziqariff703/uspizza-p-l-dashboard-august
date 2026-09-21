/** Replay supplied workbooks against existing daily rows. Produces a local
 * audit/repair plan only; never writes to Supabase or adds missing imports. */
import { readFile, writeFile } from 'node:fs/promises'
import { parseSalesFile, type SalesSource } from '../src/lib/salesImportParser'
import { dailyTotals } from '../src/lib/salesDailyTotals'
import { PL_MASTER, planPlOutlets, mergePlDailyTotals } from '../src/lib/plOutletResolver'
import type { AliasSource } from '../src/lib/outletDirectory'
import { normalizeOutletName } from '../src/lib/outletMatcher'

const audit = 'datasource/_audit'
const before = JSON.parse(await readFile(`${audit}/section1-before-20260918.json`, 'utf8')) as Array<{
  id: string; sales_import_id: string; outlet_id: string; sales_date: string;
  source: string; file_name: string; code: string; name: string; record_count: number;
  payout: string | null; [key: string]: unknown;
}>
const fields = {
  grossSales: 'gross_sales', discount: 'discount', netSales: 'net_sales',
  tax: 'tax', serviceCharge: 'service_charge', platformFees: 'platform_fees',
} as const
const updates: Array<Record<string, unknown>> = []
const summaries = []
for (const importId of new Set(before.map(row => row.sales_import_id))) {
  const stored = before.filter(row => row.sales_import_id === importId)
  const first = stored[0]
  const source = ({ grab: 'Grab', foodpanda: 'FoodPanda', shopee: 'Shopee' } as const)[first.source as 'grab' | 'foodpanda' | 'shopee']
  const path = first.source === 'grab' ? 'datasource/GRAB Aug sales.xlsx'
    : first.source === 'shopee' ? 'datasource/SHOPEE/Shopee Aug Sales.xlsx'
      : `datasource/FOODPANDA/${first.file_name}`
  const file = new File([await readFile(path)], first.file_name)
  const parsed = await parseSalesFile(file, source as SalesSource, '2026-08')
  const totals = dailyTotals(parsed.staged)
  const directory = { outlets: [...new Map(stored.filter(row => PL_MASTER.some(master => master.code === row.code)).map(row => [row.outlet_id, {
    id: row.outlet_id, name: row.name, code: row.code,
    entity: PL_MASTER.find(master => master.code === row.code)!.entity,
  }])).values()], aliases: {} }
  const plan = planPlOutlets([...new Set(totals.map(row => row.outletName))].map(name => ({
    name, source: first.source as AliasSource, dailyRows: 1,
  })), directory)
  // Existing legacy identities may be replayed by exact normalized location,
  // but never created, renamed or added to the corporate master here.
  for (const total of totals) {
    if (plan.approved.some(row => row.store.name === total.outletName)) continue
    const matches = [...new Map(stored.filter(row => normalizeOutletName(row.name) === normalizeOutletName(total.outletName)).map(row => [row.outlet_id, row])).values()]
    if (matches.length === 1) plan.approved.push({ store: { name: total.outletName, source: first.source as AliasSource, dailyRows: 1 }, outlet: { id: matches[0].outlet_id, name: matches[0].name, code: matches[0].code, entity: null }, decision: 'automatic', via: 'canonical-name', candidates: [], reason: 'Replay existing identity only.' })
  }
  const replayed = mergePlDailyTotals(totals.flatMap(total => {
    const match = plan.approved.find(row => row.store.name === total.outletName)
    return match ? [{ total, match }] : []
  }))
  let changed = 0
  const conservation = [...new Set(stored.map(row => row.outlet_id))].every(id => {
    const a = stored.filter(row => row.outlet_id === id)
    const b = replayed.filter(row => row.match.outlet!.id === id)
    return a.reduce((sum, row) => sum + row.record_count, 0) === b.reduce((sum, row) => sum + row.total.recordCount, 0)
      && Math.abs(a.reduce((sum, row) => sum + Number(row.payout), 0) - b.reduce((sum, row) => sum + Number(row.total.amounts.payout), 0)) < 0.001
  })
  const mismatches: string[] = []
  for (const row of stored) {
    const found = replayed.find(entry => entry.match.outlet!.id === row.outlet_id && entry.total.salesDate === row.sales_date)
    if (!found || found.total.recordCount !== row.record_count
      || (found.total.amounts.payout === null ? row.payout !== null : row.payout === null || Math.abs(Number(found.total.amounts.payout) - Number(row.payout)) > 0.000001)) {
      mismatches.push(`${row.code}:${row.sales_date}: count ${row.record_count}/${found?.total.recordCount}; payout ${row.payout}/${found?.total.amounts.payout}`)
      continue
    }
    const patch = Object.fromEntries(Object.entries(fields).map(([key, column]) => [column, found.total.amounts[key as keyof typeof fields]]))
    // Never propose a mixed-basis partial repair for an unreconciled import.
    if (!conservation) continue
    if (Object.entries(patch).some(([key, value]) => value === null ? row[key] !== null : row[key] === null || Number(value) !== Number(row[key]))) {
      updates.push({ id: row.id, sales_import_id: importId, before: row, ...patch })
      changed++
    }
  }
  summaries.push({ source: first.source, file: first.file_name, conservation, stored: stored.length, replayed: replayed.length,
    changed, mismatches, missingDailyRows: replayed.filter(entry => !stored.some(row => row.outlet_id === entry.match.outlet!.id && row.sales_date === entry.total.salesDate)).length })
}
await writeFile(`${audit}/section1-repair-plan-20260918.json`, JSON.stringify({ summaries, updates }))
console.log(JSON.stringify({ imports: summaries.length, updates: updates.length,
  conservationFailures: summaries.filter(row => !row.conservation),
  mismatches: summaries.filter(row => row.mismatches.length),
  missingDailyRows: summaries.filter(row => row.missingDailyRows),
  bySource: summaries.reduce<Record<string, number>>((sum, row) => ({ ...sum, [row.source]: (sum[row.source] ?? 0) + row.changed }), {}),
}))
