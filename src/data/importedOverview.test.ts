import assert from 'node:assert/strict'
import { test } from 'node:test'
import { importedOverview } from './importedOverview'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OverviewPage } from '../pages/overview/OverviewPage'

// Every live row is joined to a canonical outlet: identity and entity both come
// from that join. No name matching or alias guessing happens in aggregation.
const MY = 'MY US PIZZA SDN BHD'
const SABAH = 'MY US PIZZA (SABAH) SDN BHD'

const pos = {
  sales_date: '2026-08-01', outlet_name: 'Greenlane', outlet_id: 'o-greenlane', outlet_code: 'MY-020',
  entity: MY, source: 'pos', gross_sales: '100', discount: '20', net_sales: '80', tax: '4.8',
  service_charge: '8', platform_fees: null, advertising_spend: null, payout: '0', record_count: 2,
}

test('legacy Grab copied sales bases stay unavailable pending reconciliation', () => {
  const { totals } = importedOverview([{ ...pos, source: 'grab', gross_sales: '100', net_sales: '100', discount: '-20', service_charge: null, tax: '6', payout: '70', platform_fees: '30' }], 'all')
  const grab = totals.byPlatform.find(row => row.platform === 'grab')!
  assert.equal(grab.grossMenu, null)
  assert.equal(grab.net, null)
  assert.equal(grab.discount, 20)
  assert.equal(grab.tax, 6)
  assert.equal(grab.commissionAndFees, 30)
  assert.equal(grab.settlement, 70)
})

test('POS rows compute the exact headline derivation', () => {
  const { totals } = importedOverview([pos], 'all')
  assert.equal(totals.grossMenu, 100)
  assert.equal(totals.discount, 20)
  assert.equal(totals.net, 80)
  assert.equal(totals.serviceCharge, 8)
  assert.equal(totals.tax, 4.8)
  assert.equal(totals.netSC, 88)
  assert.equal(totals.netSCTax, 92.8)
})

test('platform report rows never inflate the all-channel POS headline', () => {
  const platformRows = [
    { ...pos, source: 'shopee', gross_sales: '50', net_sales: '30', payout: '30' },
    { ...pos, source: 'grab', gross_sales: '40', net_sales: '25', payout: '25' },
  ]
  const combined = importedOverview([pos, ...platformRows], 'all')
  const posOnly = importedOverview([pos], 'all')
  assert.equal(combined.totals.net, posOnly.totals.net)
  assert.equal(combined.totals.net, 80)
  assert.equal(combined.totals.netSCTax, 92.8)
})

test('an unknown money value makes the affected aggregate unknown, never zero', () => {
  const unknownTax = { ...pos, tax: null }
  const { totals } = importedOverview([unknownTax], 'all')
  assert.equal(totals.tax, null)
  assert.equal(totals.netSCTax, null)
  assert.equal(totals.net, 80)
  assert.equal(totals.netSC, 88)
})

test('entity scopes use the canonical outlet entity and POS counts are unique by outlet_id', () => {
  const secondDate = { ...pos, sales_date: '2026-08-02' }
  const sabahRow = { ...pos, sales_date: '2026-08-01', outlet_id: 'o-kk', outlet_name: 'Kota Kinabalu', entity: SABAH }
  const { counts } = importedOverview([pos, secondDate, sabahRow], 'all')
  assert.equal(counts.all, 2)
  assert.equal(counts.myUsPizza, 1)
  assert.equal(counts.sabah, 1)
  assert.equal(importedOverview([pos, sabahRow], 'myUsPizza').totals.net, 80)
  assert.equal(importedOverview([pos, sabahRow], 'sabah').totals.net, 80)
})

test('per-platform settlement derives from known payout only, and keptPct follows', () => {
  const shopeeRow = { ...pos, source: 'shopee', gross_sales: '50', net_sales: '30', payout: '30', platform_fees: '5', advertising_spend: '3' }
  const { totals } = importedOverview([pos, shopeeRow], 'all')
  const shopee = totals.byPlatform.find(p => p.platform === 'shopee')!
  const grab = totals.byPlatform.find(p => p.platform === 'grab')!
  const posCol = totals.byPlatform.find(p => p.platform === 'pos')!
  // Shopee states a payout and an explicit gross, so settlement and keptPct exist.
  assert.equal(shopee.grossMenu, 50)
  assert.equal(shopee.settlement, 30)
  assert.equal(shopee.keptPct, 60)
  assert.equal(shopee.net, 30)
  assert.equal(shopee.discount, 20)
  assert.equal(shopee.serviceCharge, 8)
  assert.equal(shopee.tax, 4.8)
  assert.equal(shopee.netSCTax, 42.8)
  assert.equal(shopee.commissionAndFees, 12.8)
  // A platform with no rows has no settlement at all.
  assert.equal(grab.settlement, null)
  // POS is all-channel, so it never carries a per-platform settlement.
  assert.equal(posCol.grossMenu, null)
  assert.equal(posCol.settlement, null)
})

test('an unknown payout makes that platform settlement unavailable, not zero', () => {
  const shopeeNoPayout = { ...pos, source: 'shopee', gross_sales: '50', net_sales: '30', payout: null }
  const { totals } = importedOverview([shopeeNoPayout], 'all')
  const shopee = totals.byPlatform.find(p => p.platform === 'shopee')!
  assert.equal(shopee.grossMenu, 50)
  assert.equal(shopee.settlement, null)
  assert.equal(shopee.keptPct, null)
})

test('platform differences use exact decimals and preserve credits', () => {
  const row = { ...pos, source: 'apps', gross_sales: '0.30', net_sales: '0.20',
    discount: '0.10', service_charge: '0.10', tax: '0.02', payout: '0.35', platform_fees: '999' }
  const apps = importedOverview([row], 'all').totals.byPlatform[3]
  assert.equal(apps.discount, 0.1)
  assert.equal(apps.netSC, 0.3)
  assert.equal(apps.netSCTax, 0.32)
  assert.equal(apps.commissionAndFees, -0.03)
})

test('missing platform tax prevents a partial collected basis or invented fees', () => {
  const rows = [{ ...pos, source: 'grab' }, { ...pos, source: 'grab', tax: null }]
  const grab = importedOverview(rows, 'all').totals.byPlatform[0]
  assert.equal(grab.grossMenu, 200)
  assert.equal(grab.discount, 40)
  assert.equal(grab.serviceCharge, 16)
  assert.equal(grab.tax, null)
  assert.equal(grab.netSCTax, null)
  assert.equal(grab.commissionAndFees, null)
  assert.equal(grab.settlement, 0)
})

test('known tax and reported deductions remain visible when service charge is unknown', () => {
  const row = { ...pos, source: 'foodpanda', service_charge: null, platform_fees: '5.36' }
  const platform = importedOverview([row], 'all').totals.byPlatform[1]
  assert.equal(platform.tax, 4.8)
  assert.equal(platform.serviceCharge, null)
  assert.equal(platform.commissionAndFees, 5.36)
})

test('advertising-only daily rows do not erase known Grab sales or payout', () => {
  const advert = { ...pos, source: 'grab', gross_sales: null, discount: null, net_sales: null,
    tax: null, service_charge: null, payout: null, advertising_spend: '-12.50' }
  const grab = importedOverview([{ ...pos, source: 'grab', payout: '70' }, advert], 'all').totals.byPlatform[0]
  assert.equal(grab.settlement, 70)
  assert.equal(grab.grossMenu, 100)
  assert.equal(grab.tax, 4.8)
})

test('shared Overview renders the live month without May figures, NaN, or fictional settlement', () => {
  const html = renderToStaticMarkup(createElement(OverviewPage, {
    entityFilter: 'all', channelFilter: 'All', period: 'August 2026', imported: importedOverview([pos], 'all'),
  }))
  assert.match(html, /August 2026/)
  assert.match(html, /Gross → Collected/)
  assert.match(html, /Net Settlement by Platform/)
  assert.match(html, /Unavailable/)
  assert.doesNotMatch(html, /May 2026|3,503,594|NaN|Infinity/)
})

test('May still renders its existing metrics through the same Overview', () => {
  const html = renderToStaticMarkup(createElement(OverviewPage, { entityFilter: 'all', channelFilter: 'All' }))
  assert.match(html, /May 2026/)
  assert.match(html, /3,503,594/)
  assert.doesNotMatch(html, /Unavailable|NaN|Infinity/)
})

test('an unrecognised name stays visible and out of the entity totals', () => {
  // A row with no canonical join is a data-quality gap: it is reported, and it
  // never acquires a guessed entity. (sales_daily.outlet_id is NOT NULL, so this
  // is exceptional, but the aggregation must not silently drop it.)
  const rows = [{ ...pos, outlet_id: null, entity: null, outlet_name: 'Wonder Kitchen Bhd' }, { ...pos, outlet_id: null, entity: null, outlet_name: 'ST Rosyam Mall Klang' }]
  const result = importedOverview(rows, 'all')
  assert.deepEqual(result.unmapped, ['ST Rosyam Mall Klang', 'Wonder Kitchen Bhd'])
  assert.equal(result.posUnmapped, 2)
  // Unmapped rows have no outlet_id, so they count as distinct gaps in `all`
  // but never enter an entity scope.
  assert.equal(result.counts.all, 2)
  // In `all` scope their money still sums; the entity totals exclude them.
  assert.equal(result.totals.net, 160)
  assert.equal(importedOverview(rows, 'myUsPizza').totals.net, null)
})

test('a value the source never provided keeps the total unknown instead of zero', () => {
  const shopeeShaped = { ...pos, tax: null, service_charge: null }
  const result = importedOverview([shopeeShaped], 'all')
  assert.equal(result.totals.net, 80)
  assert.equal(result.totals.tax, null)
  assert.equal(result.totals.serviceCharge, null)
  assert.equal(result.totals.netSCTax, null)
})

// Draft/failed exclusion (`.eq('sales_imports.status', 'imported')`) is enforced
// at the query layer in ImportedSalesSection, so it is not testable here: the
// aggregation only ever receives rows already filtered to imported status.
