import assert from 'node:assert/strict'
import { test } from 'node:test'
import { importedOverview } from './importedOverview'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OverviewPage } from '../pages/overview/OverviewPage'
import { aliasKey, OUTLET_MASTER, resolveOutlet } from './outletMaster'

const pos = { sales_date: '2026-08-01', outlet_name: 'US Pizza - Greenlane', source: 'pos', gross_sales: '100', discount: '20', net_sales: '80', tax: '4.8', service_charge: '8', payout: '0', record_count: 2 }
test('confirmed aliases consolidate counts and outlet sales without losing money', () => {
  const master = OUTLET_MASTER.find(o => o.name === 'Dpulze Cyberjaya')!
  const rows = ['US Pizza - D’Pulze', 'US Pizza Dpulze Shopping Centre'].map(outlet_name => ({ ...pos, outlet_name }))
  const mappings = { outlets: [], aliases: Object.fromEntries(rows.map(r => [aliasKey(r.source, r.outlet_name), master.id])) }
  const result = importedOverview(rows, 'all', mappings)
  assert.equal(result.counts.all, 1)
  assert.equal(result.posUnmapped, 0)
  assert.equal(result.outlets[0].name, master.name)
  assert.equal(result.outlets[0].net, 160)
  assert.equal(result.totals.net, importedOverview(rows, 'all').totals.net)
  assert.equal(importedOverview(rows, 'myUsPizza', mappings).totals.net, 160)
})
test('source-specific aliases do not map another source or sister brand', () => {
  const mappings = { outlets: [], aliases: { [aliasKey('shopee', 'US Pizza - Dpulze')]: 'MY-030' } }
  assert.equal(resolveOutlet('shopee', 'US Pizza - Dpulze', mappings)?.id, 'MY-030')
  assert.equal(resolveOutlet('pos', 'US Pizza - Dpulze', mappings), undefined)
  assert.equal(resolveOutlet('shopee', 'The Manhattan FISH MARKET - Dpulze', mappings), undefined)
})
test('POS counts partition into both entities and unresolved names; platform-only names do not inflate them', () => {
  const result = importedOverview([pos, { ...pos, outlet_name: 'US Pizza Bundusan' }, { ...pos, outlet_name: 'US Pizza Unknown' }, { ...pos, source: 'shopee', outlet_name: 'US Pizza Other unknown' }], 'all')
  assert.equal(result.counts.all, result.counts.myUsPizza + result.counts.sabah + result.posUnmapped)
  assert.equal(result.counts.all, 3)
  assert.equal(result.counts.sabah, 1)
  assert.equal(result.posUnmapped, 1)
})
test('all-channel POS is not added to platform sales and missing financials stay unknown', () => {
  const result = importedOverview([pos, { ...pos, source: 'shopee', gross_sales: '50', net_sales: '30', payout: '30' }], 'all')
  assert.equal(result.totals.net, 80)
  assert.equal(result.totals.netSCTax, 92.8)
  assert.equal(result.totals.purchases, null)
  assert.equal(result.totals.margin, null)
  assert.equal(result.totals.byPlatform.find(p => p.platform === 'shopee')?.settlement, null)
  assert.equal(result.totals.byPlatform.find(p => p.platform === 'pos')?.grossMenu, null)
})
test('platform-only data cannot claim a tax-exclusive overall net sales figure', () => {
  assert.equal(importedOverview([{ ...pos, source: 'shopee' }], 'all').totals.net, null)
})
test('unmapped outlets remain visible in all scope and never acquire a guessed entity', () => {
  const row = { ...pos, outlet_name: 'US Pizza - Unknown branch' }
  assert.equal(importedOverview([row], 'all').totals.net, 80)
  assert.equal(importedOverview([row], 'myUsPizza').totals.net, null)
  assert.deepEqual(importedOverview([row], 'all').unmapped, ['US Pizza - Unknown branch'])
})
test('sister brands are excluded before outlet matching', () => {
  assert.equal(importedOverview([{ ...pos, outlet_name: 'The Manhattan FISH MARKET - Greenlane' }], 'all').totals.net, null)
})
test('shared Overview renders August without May figures, NaN, or fictional settlement', () => {
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

test('an unrecognised name is never dropped: it stays visible and out of the entity totals', () => {
  // Real August names that the old "must start with US Pizza" gate discarded
  // without counting or reporting them.
  const rows = [{ ...pos, outlet_name: 'Wonder Kitchen Bhd' }, { ...pos, outlet_name: 'ST Rosyam Mall Klang' }]
  const result = importedOverview(rows, 'all')
  assert.deepEqual(result.unmapped, ['Wonder Kitchen Bhd'])
  assert.equal(result.posUnmapped, 1)
  assert.equal(result.counts.all, 2)
  assert.equal(result.totals.net, 160)
  assert.equal(importedOverview(rows, 'myUsPizza').totals.net, 80)
})
test('an operating-company prefix resolves only when the remainder names one outlet', () => {
  assert.equal(resolveOutlet('grab', "Marshall's Co - Greenlane")?.name, 'Greenlane')
  assert.equal(resolveOutlet('grab', "Marshall's Co - SS2")?.name, 'SS2')
  // An abbreviation still needs a recorded alias, so nothing is guessed.
  assert.equal(resolveOutlet('grab', "Marshall's Co - Jalan SS15"), undefined)
  // Stripping the prefix must not hand a sister brand one of our outlets.
  assert.equal(resolveOutlet('grab', 'The Manhattan FISH MARKET - Greenlane'), undefined)
})
test('a value the source never provided keeps the total unknown instead of zero', () => {
  const shopeeShaped = { ...pos, tax: null, service_charge: null }
  const result = importedOverview([shopeeShaped], 'all')
  assert.equal(result.totals.net, 80)
  assert.equal(result.totals.tax, null)
  assert.equal(result.totals.serviceCharge, null)
  assert.equal(result.totals.netSCTax, null)
})
