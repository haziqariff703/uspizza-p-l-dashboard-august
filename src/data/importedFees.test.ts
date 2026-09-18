import assert from 'node:assert/strict'
import test from 'node:test'
import { importedFees } from './importedFees'
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

test('known Grab platform fees and advertising aggregate exactly', () => {
  const { platforms } = importedFees([row('grab', '2.50', '1.25')], 'All')
  const grab = platforms.find(p => p.source === 'grab')!
  assert.equal(grab.platformFees, '2.50')
  assert.equal(grab.advertisingSpend, '1.25')
  assert.equal(grab.knownCosts, '3.75')
  assert.equal(grab.knownCostsState, 'known')
})

test('exact-decimal sums never float-drift', () => {
  const { platforms } = importedFees([
    row('grab', '0.10', '0'),
    row('grab', '0.20', '0'),
  ], 'All')
  assert.equal(platforms.find(p => p.source === 'grab')!.platformFees, '0.30')
})

test('a null applicable amount makes the platform total unknown, not RM0', () => {
  const { platforms } = importedFees([
    row('grab', '2.50', '1.25'),
    row('foodpanda', null, '3'),
  ], 'All')
  const fp = platforms.find(p => p.source === 'foodpanda')!
  assert.equal(fp.platformFees, null)
  assert.equal(fp.platformFeesState, 'unknown')
  assert.equal(fp.knownCostsState, 'unknown')
})

test('no rows for Shopee/Apps/POS are unavailable (none), not RM0', () => {
  const { platforms } = importedFees([row('grab', '2.50', '1.25')], 'All')
  for (const source of ['shopee', 'apps', 'pos'] as const) {
    const p = platforms.find(x => x.source === source)!
    assert.equal(p.rowCount, 0)
    assert.equal(p.platformFeesState, 'none')
    assert.equal(p.payoutState, 'none')
    assert.equal(p.platformFees, null)
  }
})

test('a stated zero is a real zero, distinct from unknown and none', () => {
  const { platforms } = importedFees([row('grab', '0', '0')], 'All')
  const grab = platforms.find(p => p.source === 'grab')!
  assert.equal(grab.platformFees, '0')
  assert.equal(grab.platformFeesState, 'known')
  assert.equal(grab.knownCosts, '0')
})

test('entity filtering excludes the other entity', () => {
  const rows = [
    row('grab', '5', '1', { entity: 'MY US PIZZA SDN BHD' }),
    row('grab', '7', '1', { entity: 'MY US PIZZA (SABAH) SDN BHD', outlet_id: 's1' }),
  ]
  const my = importedFees(rows, 'All', 'myUsPizza').platforms.find(p => p.source === 'grab')!
  assert.equal(my.platformFees, '5')
  const sabah = importedFees(rows, 'All', 'sabah').platforms.find(p => p.source === 'grab')!
  assert.equal(sabah.platformFees, '7')
})

test('channel filtering returns only the selected source', () => {
  const result = importedFees([row('grab', '2.50', '1.25'), row('foodpanda', '1', '1')], 'Grab')
  assert.deepEqual(result.platforms.map(p => p.source), ['grab'])
})

test('an unknown source makes the whole total unavailable but keeps a labelled partial', () => {
  const result = importedFees([
    row('grab', '2.50', '1.25'),
    row('foodpanda', null, '3'),
  ], 'All')
  assert.equal(result.hasUnknown, true)
  assert.equal(result.knownTotalCosts, null)
  assert.equal(result.partialKnownCosts, '3.75')
})

test('coverage counts rows, days and distinct outlets', () => {
  const rows = [
    row('grab', '1', '0', { sales_date: '2026-08-01', outlet_id: 'o1' }),
    row('grab', '1', '0', { sales_date: '2026-08-01', outlet_id: 'o2' }),
    row('grab', '1', '0', { sales_date: '2026-08-02', outlet_id: 'o1' }),
  ]
  const grab = importedFees(rows, 'All').platforms.find(p => p.source === 'grab')!
  assert.equal(grab.rowCount, 3)
  assert.equal(grab.dayCount, 2)
  assert.equal(grab.outletCount, 2)
})

test('unmapped outlets still count as distinct outlets, never hidden', () => {
  const rows = [
    row('grab', '1', '0', { outlet_id: null, outlet_name: 'Ghost A' }),
    row('grab', '1', '0', { outlet_id: null, outlet_name: 'Ghost B' }),
  ]
  const grab = importedFees(rows, 'All').platforms.find(p => p.source === 'grab')!
  assert.equal(grab.outletCount, 2)
})

test('an empty month is empty, with no total and no partial', () => {
  const result = importedFees([], 'All')
  assert.equal(result.empty, true)
  assert.equal(result.knownTotalCosts, null)
  assert.equal(result.partialKnownCosts, null)
  assert.equal(result.hasUnknown, false)
})
