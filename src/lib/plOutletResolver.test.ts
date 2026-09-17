import assert from 'node:assert/strict'
import { test } from 'node:test'
import { PL_MASTER, planPlOutlets, mergePlDailyTotals } from './plOutletResolver'
import { OUTLET_NAME_MAP } from '../data/outletNameMap'
import { MONEY_KEYS } from './salesImportParser'
import type { DailyTotal } from './salesDailyTotals'
import type { AliasSource } from './outletDirectory'

const directory = { outlets: PL_MASTER.map(row => ({ ...row, id: row.code })), aliases: {} }
const store = (name: string, source: AliasSource = 'pos') => ({ name, source, dailyRows: 1 })

test('all 44 P&L outlets resolve by name and code without stored aliases', () => {
  assert.equal(PL_MASTER.length, 44)
  for (const outlet of PL_MASTER) {
    for (const name of [outlet.name, outlet.code, `US PIZZA (${outlet.name.toUpperCase()})`]) {
      assert.equal(planPlOutlets([store(name)], directory).approved[0]?.outlet?.code, outlet.code, name)
    }
  }
})

test('existing source spellings resolve only to members of the P&L list', () => {
  for (const row of OUTLET_NAME_MAP) {
    for (const [source, names] of Object.entries(row.sources)) {
      for (const name of names ?? []) {
        const result = planPlOutlets([store(name, source as AliasSource)], directory)
        if (PL_MASTER.some(master => master.code === row.code)) {
          assert.equal(result.approved[0]?.outlet?.code, row.code, `${source}: ${name}`)
        } else assert.equal(result.excluded.length, 1, name)
      }
    }
  }
})

test('unknown, pre-opening, sister brand and near-miss names are excluded without confirmation', () => {
  for (const name of ['US Pizza Taman Connaught', 'US Pizza Kota Damansara', 'Greenlanes', 'Unlisted Store', 'The Manhattan Fish Market - Greenlane', '']) {
    const result = planPlOutlets([store(name)], directory)
    assert.equal(result.excluded.length, 1, name)
    assert.equal(result.unresolved.length, 0)
  }
})

test('a saved manual alias cannot override the P&L master', () => {
  const result = planPlOutlets([store('Greenlane')], { ...directory, aliases: { 'pos:greenlane': 'MY-009' } })
  assert.equal(result.approved[0]?.outlet?.code, 'MY-020')
})

test('missing database identities are not replaced with static foreign keys', () => {
  const result = planPlOutlets([store('Greenlane')], { outlets: [], aliases: {} })
  assert.equal(result.missing.length, 1)
  assert.equal(result.stores[0].outlet, null)
})

test('same-outlet daily variants merge exact money, record counts and unknown values', () => {
  const match = planPlOutlets([store('Greenlane')], directory).approved[0]
  const total = (name: string, value: string, tax: string | null): DailyTotal => ({
    outletName: name, salesDate: '2026-08-01', recordCount: 1,
    amounts: { ...Object.fromEntries(MONEY_KEYS.map(key => [key, value])), tax } as DailyTotal['amounts'],
  })
  const first = total('Greenlane', '0.10', '0.00')
  const merged = mergePlDailyTotals([{ match, total: first }, { match, total: total('US Pizza Greenlane', '0.20', null) }])
  assert.equal(merged.length, 1)
  assert.equal(merged[0].total.amounts.netSales, '0.30')
  assert.equal(merged[0].total.amounts.tax, null)
  assert.equal(merged[0].total.recordCount, 2)
  assert.equal(first.recordCount, 1)
})
