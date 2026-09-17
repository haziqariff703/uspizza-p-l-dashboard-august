import assert from 'node:assert/strict'
import { test } from 'node:test'
import { coverageTotals, importedCoverage } from './importedCoverage'
import { directoryKey, type OutletDirectory } from '../lib/outletDirectory'
import type { ImportedRow } from './importedOverview'

const GREENLANE = { id: 'o1', name: 'Greenlane', code: 'MY-020', entity: 'MY US PIZZA SDN BHD' }
const SS2 = { id: 'o2', name: 'SS2', code: 'MY-005', entity: 'MY US PIZZA SDN BHD' }

const directory = (aliases: Record<string, string> = {}): OutletDirectory =>
  ({ outlets: [GREENLANE, SS2], aliases })

const row = (outletId: string, source: string, date = '2026-08-01'): ImportedRow => ({
  sales_date: date, outlet_name: 'Greenlane', outlet_id: outletId, entity: 'MY US PIZZA SDN BHD', source,
  gross_sales: '10', discount: null, net_sales: '10', tax: null, service_charge: null,
  payout: null, record_count: 4,
})

const cell = (coverage: ReturnType<typeof importedCoverage>, outletId: string, source: string) =>
  coverage.find(outlet => outlet.id === outletId)!.cells.find(item => item.source === source)!

test('automatic P&L matching does not require aliases for coverage', () => {
  const coverage = importedCoverage({ directory: directory(), rows: [], automaticOutlets: true })
  assert.equal(cell(coverage, 'o1', 'shopee').state, 'unavailable')
})

test('a source with rows is Imported, with its records and dates counted', () => {
  const coverage = importedCoverage({
    directory: directory(), rows: [row('o1', 'pos'), row('o1', 'pos', '2026-08-02')],
  })
  const pos = cell(coverage, 'o1', 'pos')
  assert.equal(pos.state, 'imported')
  assert.equal(pos.records, 8)
  assert.equal(pos.days, 2)
})

test('an aliased source that sent nothing is Missing, not Unmapped', () => {
  const coverage = importedCoverage({
    directory: directory({ [directoryKey('grab', 'Greenlane Grab')]: 'o1' }), rows: [],
  })
  assert.equal(cell(coverage, 'o1', 'grab').state, 'missing')
})

test('a source with no alias at all is Unmapped — nothing can ever arrive for it', () => {
  const coverage = importedCoverage({ directory: directory(), rows: [] })
  assert.equal(cell(coverage, 'o1', 'shopee').state, 'unmapped')
})

test('a failed import reports Failed even where a partial run left rows behind', () => {
  const coverage = importedCoverage({ directory: directory(), rows: [row('o1', 'grab')], failedSources: ['grab'] })
  assert.equal(cell(coverage, 'o1', 'grab').state, 'failed')
})

test('GRN is Unavailable until a real purchases source is loaded', () => {
  const none = importedCoverage({ directory: directory(), rows: [] })
  assert.equal(cell(none, 'o1', 'grn').state, 'unavailable')
  const withPurchases = importedCoverage({ directory: directory(), rows: [], purchaseOutletIds: ['o1'] })
  assert.equal(cell(withPurchases, 'o1', 'grn').state, 'imported')
  assert.equal(cell(withPurchases, 'o2', 'grn').state, 'unavailable')
})

test('an outlet with rows but missing from the directory is still shown, never hidden', () => {
  const coverage = importedCoverage({ directory: { outlets: [], aliases: {} }, rows: [row('ghost', 'pos')] })
  assert.equal(coverage.length, 1)
  assert.equal(coverage[0].id, 'ghost')
  assert.equal(cell(coverage, 'ghost', 'pos').state, 'imported')
})

test('coverage totals count outlets per state and never claim completeness', () => {
  const coverage = importedCoverage({
    directory: directory({ [directoryKey('grab', 'SS2 Grab')]: 'o2' }),
    rows: [row('o1', 'pos')],
  })
  const totals = coverageTotals(coverage)
  const pos = totals.find(item => item.source === 'pos')!
  assert.equal(pos.counts.imported, 1)
  assert.equal(pos.counts.unmapped, 1)
  const grab = totals.find(item => item.source === 'grab')!
  assert.equal(grab.counts.missing, 1)
  assert.equal(grab.counts.unmapped, 1)
})
