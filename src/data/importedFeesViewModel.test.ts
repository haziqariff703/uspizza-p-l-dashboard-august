import assert from 'node:assert/strict'
import test from 'node:test'
import { importedFeesViewModel } from './importedFees'
import type { ImportedRow } from './importedOverview'

const row = (
  source: string,
  platform_fees: string | null,
  advertising_spend: string | null,
  overrides: Partial<ImportedRow> = {},
): ImportedRow => ({
  sales_date: '2026-08-01',
  outlet_name: 'Greenlane',
  outlet_id: 'o1',
  outlet_code: 'MY-1',
  entity: 'MY US PIZZA SDN BHD',
  source,
  gross_sales: null,
  discount: null,
  net_sales: null,
  tax: null,
  service_charge: null,
  platform_fees,
  advertising_spend,
  payout: '10',
  record_count: 1,
  ...overrides,
})

const view = (rows: ImportedRow[], channel: Parameters<typeof importedFeesViewModel>[1] = 'All') =>
  importedFeesViewModel(rows, channel, 'all', 'August 2026')

const platform = (rows: ImportedRow[], name: 'Grab' | 'FoodPanda' | 'Shopee' | 'Apps') => {
  const viewModel = view(rows)
  return viewModel.platforms.find(entry => entry.platform === name)!
}

test('section 2: exact decimal sums survive the view-model', () => {
  const grab = platform([row('grab', '0.10', '0.20'), row('grab', '0.20', '0.10')], 'Grab')
  assert.equal(grab.cells.platformFees.value, '0.30')
  assert.equal(grab.cells.advertising.value, '0.30')
})

test('section 2: explicit zero is known, distinct from null unknown and no rows', () => {
  const known = platform([row('grab', '0', '0')], 'Grab')
  assert.equal(known.cells.platformFees.state, 'known')
  assert.equal(known.cells.platformFees.value, '0')

  const unknown = platform([row('grab', null, '0')], 'Grab')
  assert.equal(unknown.cells.platformFees.state, 'unknown')
  assert.equal(unknown.cells.platformFees.value, null)

  const none = platform([], 'Grab')
  assert.equal(none.cells.platformFees.state, 'none')
  assert.equal(none.cells.platformFees.value, null)
})

test('section 2: no rows differs from unknown fields', () => {
  const withRows = platform([row('grab', null, '0')], 'Grab')
  assert.equal(withRows.absent, false)
  assert.equal(withRows.cells.platformFees.state, 'unknown')

  const withoutRows = platform([row('foodpanda', '1', '0')], 'Grab')
  assert.equal(withoutRows.absent, true)
  assert.equal(withoutRows.cells.platformFees.state, 'none')
  assert.equal(withoutRows.coverage.label, 'Coverage not verified')
})

test('section 2: partial coverage cannot produce a completed platform total', () => {
  const grab = platform([row('grab', '2.50', '1.25')], 'Grab')
  // Commission/gateway/adjustments are not persisted -> unknown -> total cannot complete.
  assert.equal(grab.cells.commission.state, 'unknown')
  assert.equal(grab.total.state, 'unknown')
  assert.equal(grab.total.value, null)
  assert.equal(grab.totalPartialValue, '3.75')
  assert.equal(grab.coverage.label, 'Partial coverage')
  const model = view([row('grab', '2.50', '1.25')])
  assert.equal(model.totals.totalFees.state, 'unknown')
  assert.equal(model.totals.totalFeesPartialValue, '3.75')
})

test('section 2: the Total column is unavailable when any platform is unknown', () => {
  const model = view([row('grab', '2.50', '1.25'), row('foodpanda', '1', '1')])
  assert.equal(model.matrix.advertising.Total.state, 'unknown')
  assert.equal(model.matrix.advertising.Total.value, null)
})

test('section 2: entity and channel filters are applied before totals', () => {
  const rows = [
    row('grab', '5', '1', { entity: 'MY US PIZZA SDN BHD', outlet_id: 'o1' }),
    row('grab', '7', '1', { entity: 'MY US PIZZA (SABAH) SDN BHD', outlet_id: 's1' }),
    row('foodpanda', '9', '1', { entity: 'MY US PIZZA SDN BHD', outlet_id: 'o2' }),
  ]
  const my = importedFeesViewModel(rows, 'All', 'myUsPizza', 'August 2026')
  assert.equal(my.platforms.find(p => p.platform === 'Grab')!.cells.platformFees.value, '5')
  const sabah = importedFeesViewModel(rows, 'All', 'sabah', 'August 2026')
  assert.equal(sabah.platforms.find(p => p.platform === 'Grab')!.cells.platformFees.value, '7')
  const grabOnly = importedFeesViewModel(rows, 'Grab', 'all', 'August 2026')
  assert.equal(grabOnly.platforms.find(p => p.platform === 'FoodPanda')!.cells.platformFees.state, 'none')
})

test('section 2: Shopee never renders an invented fee or payout from Transaction − Earnings', () => {
  // The audited Shopee export has Transaction Amount === Earnings on every row,
  // which the old derivation would have flattened into an RM0 platform fee.
  const shopee = platform([row('shopee', '0', '0')], 'Shopee')
  assert.equal(shopee.cells.platformFees.state, 'known')
  assert.equal(shopee.cells.platformFees.value, '0')
  // A zero platform_fee on the persisted row is the source's own value; the
  // invented step is treating that zero as a statement fee. Commission, gateway
  // and adjustments (the fields the export does not carry) stay unavailable.
  assert.equal(shopee.cells.commission.state, 'unknown')
  assert.equal(shopee.cells.paymentGateway.state, 'unknown')
  assert.equal(shopee.cells.adjustments.state, 'unknown')

  // No rows at all -> every Shopee fee cell is Not supplied, never RM0.
  const emptyShopee = platform([row('grab', '1', '1')], 'Shopee')
  assert.equal(emptyShopee.absent, true)
  assert.equal(emptyShopee.cells.platformFees.value, null)
  assert.equal(emptyShopee.cells.platformFees.state, 'none')
  assert.equal(emptyShopee.total.state, 'none')
})

test('section 2: Apps and POS cannot render an invented fee', () => {
  const apps = platform([row('apps', '1', '1')], 'Apps')
  assert.equal(apps.cells.paymentGateway.state, 'unknown')
  assert.equal(apps.cells.commission.state, 'unknown')

  // POS is excluded from the fee columns entirely.
  const model = view([row('pos', '0', '0')])
  assert.equal(model.platforms.some(p => p.source === ('pos' as never)), false)
  assert.equal(model.empty, true, 'a POS-only month has no fee-bearing source')
})

test('section 2: live commission rate is unavailable without a persisted denominator', () => {
  const grab = platform([row('grab', '2.50', '1.25')], 'Grab')
  assert.equal(grab.commissionRate.state, 'none')
  assert.equal(grab.commissionRate.value, null)
})

test('section 2: coverage reports range, outlets, unknown fields and exclusions', () => {
  const rows = [
    row('grab', '1', '0', { sales_date: '2026-08-01', outlet_id: 'o1' }),
    row('grab', '1', null, { sales_date: '2026-08-03', outlet_id: 'o2' }),
    row('grab', '1', '0', { sales_date: '2026-08-03', outlet_id: null, outlet_name: 'Ghost' }),
  ]
  const grab = platform(rows, 'Grab')
  assert.equal(grab.coverage.rowCount, 3)
  assert.equal(grab.coverage.dayCount, 2)
  assert.equal(grab.coverage.outletCount, 3)
  assert.equal(grab.coverage.importedFrom, '2026-08-01')
  assert.equal(grab.coverage.importedTo, '2026-08-03')
  assert.equal(grab.coverage.unknownFieldCount, 1)
  assert.equal(grab.coverage.unmappedRowCount, 1)
})

test('section 2: a failed import is a coverage state, not an absence', () => {
  const model = importedFeesViewModel(
    [row('grab', '1', '1')],
    'All',
    'all',
    'August 2026',
    0,
    [{ source: 'foodpanda', status: 'failed' }],
  )
  const foodpanda = model.platforms.find(p => p.platform === 'FoodPanda')!
  assert.equal(foodpanda.absent, true)
  assert.equal(foodpanda.coverage.label, 'Coverage not verified')
})

test('section 2: sister-brand exclusions are counted, not hidden', () => {
  const model = importedFeesViewModel([row('grab', '1', '1')], 'All', 'all', 'August 2026', 4)
  const grab = model.platforms.find(p => p.platform === 'Grab')!
  assert.equal(grab.coverage.sisterBrandExcludedCount, 4)
})

test('section 2: an empty live month is empty, with no fabricated reconciliation', () => {
  const model = view([])
  assert.equal(model.empty, true)
  assert.equal(model.totals.totalFees.state, 'none')
  assert.equal(model.totals.advertisingSpend.state, 'none')
  assert.equal(model.reconciliation.kind, 'unavailable')
})

test('section 2: a live month never borrows May figures', () => {
  const model = view([row('grab', '0.01', '0')])
  const grab = model.platforms.find(p => p.platform === 'Grab')!
  assert.equal(grab.cells.platformFees.value, '0.01')
  assert.equal(model.period, 'August 2026')
  // May's demo total (RM 799,463) can never appear here.
  assert.notEqual(model.totals.totalFees.value, '799463')
  assert.equal(model.reconciliation.kind, 'unavailable')
})
