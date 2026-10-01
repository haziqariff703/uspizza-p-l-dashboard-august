import XLSX from 'xlsx'
import { OUTLET_NAME_MAP } from '../src/data/outletNameMap'
import { ORIGINAL_OUTLETS } from '../src/data/originalOutlets'

// Rebuild the source preview after the August Grab file or outlet map changes.
// The Summary sheet's F1 rolls up fee tax across categories; count Payment tax
// in commission and Advertisement tax in advertising once each instead.
const workbook = XLSX.readFile('datasource/GRAB_Aug_sales.xlsx')
const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Sheet1)
const byAlias = new Map(OUTLET_NAME_MAP.flatMap(outlet =>
  (outlet.sources.grab ?? []).map(alias => [alias.trim().toLowerCase(), outlet.code] as const)))
const entityByCode = new Map(ORIGINAL_OUTLETS.map(outlet => [outlet.code, outlet.entity]))
const cents = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) : 0
const empty = () => ({ commission: 0, advertising: 0, platformFees: 0, outlets: new Set<string>(), rows: 0 })
const totals = { all: empty(), myUsPizza: empty(), sabah: empty() }
const unmatched = new Set<string>()

for (const row of rows) {
  const name = String(row['Store Name'] ?? '')
  if (!/^us pizza\b/i.test(name)) continue
  const code = byAlias.get(name.trim().toLowerCase())
  if (!code) { unmatched.add(name); continue }
  const entity = entityByCode.get(code)
  const scope = entity === 'MY US PIZZA (SABAH) SDN BHD' ? 'sabah' : 'myUsPizza'
  const created = String(row['Created On'] ?? '')
  const transferred = String(row['Transfer Date'] ?? '')
  if (!created.includes('Aug 2026') && !transferred.includes('Aug 2026')) continue
  for (const total of [totals.all, totals[scope]]) {
    total.outlets.add(code)
    total.rows++
    if (row.Category === 'Payment') {
      total.commission -= cents(row['Order commission']) + cents(row['Step-up commission'])
        + cents(row['GrabKitchen Commission']) + cents(row['GrabKitchen Other Commission'])
        + cents(row['Tax on GrabFood/GrabMart commission, adjustments, ads'])
      total.platformFees -= cents(row['Grab Fee']) + cents(row['Restaurant Packaging Charge'])
        + cents(row['Marketing success fee'])
    } else if (row.Category === 'Advertisement') {
      total.advertising -= cents(row.Amount)
        + cents(row['Tax on GrabFood/GrabMart commission, adjustments, ads'])
    }
  }
}

const money = (value: number) => (value / 100).toFixed(2)
console.log(JSON.stringify({
  source: 'datasource/GRAB_Aug_sales.xlsx',
  scopes: Object.fromEntries(Object.entries(totals).map(([scope, value]) => [scope, {
    commission: money(value.commission), advertising: money(value.advertising),
    platformFees: money(value.platformFees),
    knownSubtotal: money(value.commission + value.advertising + value.platformFees),
    outletCount: value.outlets.size, rowCount: value.rows,
  }])),
  unmatched: [...unmatched].sort(),
}, null, 2))
