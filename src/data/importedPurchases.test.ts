import assert from 'node:assert/strict'
import { test } from 'node:test'
import { outletProfitability, type PurchaseRow } from './importedPurchases'

const purchase = (outlet_id: string, purchase_amount: PurchaseRow['purchase_amount']): PurchaseRow => ({
  purchase_date: '2026-08-01', outlet_id, outlet_name: `Outlet ${outlet_id}`, entity: null, purchase_amount,
})

test('gross profit and margin come from imported net sales and purchases', () => {
  const [outlet] = outletProfitability([{ id: 'a', name: 'Greenlane', net: 1000 }], [purchase('a', '250'), purchase('a', '150')])
  assert.equal(outlet.purchases, 400)
  assert.equal(outlet.grossProfit, 600)
  assert.equal(outlet.margin, 60)
})

test('an outlet with no imported purchases is unavailable, never RM 0 with a 100% margin', () => {
  const [outlet] = outletProfitability([{ id: 'a', name: 'Greenlane', net: 1000 }], [])
  assert.equal(outlet.purchases, null)
  assert.equal(outlet.grossProfit, null)
  assert.equal(outlet.margin, null)
})

test('one unstated purchase amount leaves the outlet total unknown', () => {
  const [outlet] = outletProfitability([{ id: 'a', name: 'Greenlane', net: 1000 }], [purchase('a', '250'), purchase('a', null)])
  assert.equal(outlet.purchases, null)
  assert.equal(outlet.grossProfit, null)
})

test('purchases without net sales still appear, and no margin is invented', () => {
  const outlets = outletProfitability([], [purchase('b', '500')])
  assert.equal(outlets.length, 1)
  assert.equal(outlets[0].name, 'Outlet b')
  assert.equal(outlets[0].purchases, 500)
  assert.equal(outlets[0].net, null)
  assert.equal(outlets[0].grossProfit, null)
  assert.equal(outlets[0].margin, null)
})

test('zero net sales has no margin to divide by', () => {
  const [outlet] = outletProfitability([{ id: 'a', name: 'Greenlane', net: 0 }], [purchase('a', '100')])
  assert.equal(outlet.grossProfit, -100)
  assert.equal(outlet.margin, null)
})
