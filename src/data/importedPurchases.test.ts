import assert from 'node:assert/strict'
import { test } from 'node:test'
import { matchedProfitability, outletProfitability, purchaseRowFromGRN, purchaseRowFromJoined, type PurchaseRow } from './importedPurchases'

const purchase = (outlet_id: string, purchase_amount: PurchaseRow['purchase_amount']): PurchaseRow => ({
  purchase_date: '2026-08-01', outlet_id, outlet_name: `Outlet ${outlet_id}`, entity: null, purchase_amount,
})

test('overview profitability uses matching outlets and preserves losses', () => {
  const profits = outletProfitability([{ id: 'a', name: 'A', net: 100 }, { id: 'b', name: 'B', net: 50 }], [purchase('a', '125'), purchase('c', '500')])
  assert.deepEqual(matchedProfitability(profits), { net: 100, purchases: 125, grossProfit: -25, margin: -25, matchedCount: 1, excludedCount: 2 })
  assert.equal(matchedProfitability([]).grossProfit, null)
  assert.equal(matchedProfitability(outletProfitability([{ id: 'a', name: 'A', net: 0 }], [purchase('a', '5')])).margin, null)
})

test('live GRN RPC fields join purchases to POS sales without branch_code', () => {
  const row = purchaseRowFromGRN({ outlet_id: 'uuid', outlet_name: 'Greenlane', outlet_code: 'MY-001', outlet_entity: 'MY US PIZZA', total_purchase: '125.50' }, '2026-08-01')
  assert.equal(row.outlet_id, 'uuid')
  assert.equal(row.entity, 'MY US PIZZA')
  const [profit] = outletProfitability([{ id: 'uuid', name: 'Greenlane', net: 500 }], [row])
  assert.equal(profit.purchases, 125.5)
  assert.equal(profit.grossProfit, 374.5)
  assert.equal(profit.margin, 74.9)
})

test('simple-schema purchases use canonical IDs and entity without legacy branch fields', () => {
  const row = purchaseRowFromJoined({
    purchase_date: '2026-08-15', outlet_id: 'canonical-uuid', purchase_amount: '250.10',
    outlets: { name: 'Greenlane', entity: 'Sabah' },
  })
  assert.equal(row.outlet_id, 'canonical-uuid')
  assert.equal(row.entity, 'Sabah')
  assert.equal(row.purchase_date, '2026-08-15')
  const [profit] = outletProfitability([{ id: 'canonical-uuid', name: 'Greenlane', net: 1000 }], [row])
  assert.equal(profit.purchases, 250.1)
  assert.equal(profit.grossProfit, 749.9)
})

test('missing purchase join and unknown money stay unresolved instead of throwing or becoming zero', () => {
  const row = purchaseRowFromJoined({ purchase_date: '2026-08-15', outlet_id: 'canonical-uuid', purchase_amount: null })
  assert.equal(row.entity, null)
  assert.equal(row.outlet_name, 'Unnamed outlet')
  assert.equal(row.purchase_amount, null)
  assert.equal(outletProfitability([{ id: row.outlet_id, name: row.outlet_name, net: 1000 }], [row])[0].grossProfit, null)
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
