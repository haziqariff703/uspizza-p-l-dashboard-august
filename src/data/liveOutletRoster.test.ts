import assert from 'node:assert/strict'
import { test } from 'node:test'
import { liveOutletRoster } from './liveOutletRoster'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PLByOutletPage } from '../pages/pl-by-outlet/PLByOutletPage'

test('live roster includes 46 identities, including newly opened outlets, without May money', () => {
  const roster = liveOutletRoster([{ id: 'uuid', name: 'Taman Connaught', code: 'MY-051', entity: 'MY US PIZZA' }])
  assert.equal(roster.length, 46)
  assert.equal(new Set(roster.map(row => row.code)).size, 46)
  assert.equal(roster.find(row => row.code === 'MY-051')?.id, 'uuid')
  assert.equal(roster.find(row => row.code === 'MY-081')?.name, 'Kota Damansara')
  assert.ok(roster.every(row => !('netSales' in row)))
})

test('platform-only outlet remains selectable and shows missing POS/profit as dash', () => {
  const html = renderToStaticMarkup(createElement(PLByOutletPage, { entityFilter: 'all', outletsOverride: [{ name: 'Taman Connaught', code: 'MY-051', entity: 'MY US PIZZA', netSales: null, purchases: 100, grossProfit: null, marginPct: null, platforms: { Shopee: 50 } }] }))
  assert.match(html, /Taman Connaught/)
  assert.match(html, /RM 50/)
  assert.match(html, /—/)
  assert.doesNotMatch(html, /NaN|Infinity|May 2026/)
})
