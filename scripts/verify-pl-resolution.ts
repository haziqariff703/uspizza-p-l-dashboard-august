/** Read-only replay of local August workbooks. No database or Storage writes. */
import { readFile } from 'node:fs/promises'
import { parseSalesFile, type SalesSource } from '../src/lib/salesImportParser'
import { dailyTotals } from '../src/lib/salesDailyTotals'
import { PL_MASTER, planPlOutlets } from '../src/lib/plOutletResolver'
import type { AliasSource } from '../src/lib/outletDirectory'
import { validateSalesImport } from '../src/lib/salesImportValidation'

const directory = { outlets: PL_MASTER.map(row => ({ ...row, id: row.code })), aliases: {} }
const inputs: Array<[SalesSource, string]> = [
  ['POS', 'datasource/POS SALES/Sales Details Report 04-Sep-2026_1 (1).xlsx'],
  ['Grab', 'datasource/GRAB Aug sales.xlsx'],
  ['Shopee', 'datasource/SHOPEE/Shopee Aug Sales.xlsx'],
  ['Apps', 'datasource/APPS AUG ORDER LIST.xlsx'],
  ['FoodPanda', 'datasource/FOODPANDA/20260820_200541146506.xlsx'],
]
for (const [source, path] of inputs) {
  try {
  const file = new File([await readFile(path)], path.split('/').at(-1)!)
  const parsed = await parseSalesFile(file, source, '2026-08')
  const totals = dailyTotals(parsed.staged)
  const names = [...new Set(totals.map(row => row.outletName))]
  const plan = planPlOutlets(names.map(name => ({ name, source: source.toLowerCase() as AliasSource,
    dailyRows: totals.filter(row => row.outletName === name).length })), directory)
  console.log(JSON.stringify({ source, file: file.name, valid: validateSalesImport(parsed, totals, source, '2026-08').ok,
    sourceNames: names.length, matched: plan.approved.length, excluded: plan.excluded.length,
    excludedNames: plan.excluded.map(row => row.store.name),
  }))
  } catch (error) {
    console.log(JSON.stringify({ source, file: path, valid: false,
      error: error instanceof Error ? error.message : String(error) }))
    process.exitCode = 1
  }
}
