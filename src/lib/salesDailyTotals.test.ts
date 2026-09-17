import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dailyTotals } from './salesDailyTotals'
import type { StagedRow } from './salesImportParser'

const staged = (outletName: string | null, normalized: Record<string, unknown> | null): StagedRow => ({
  sourceRowNumber: 1, raw: {}, normalized: normalized as StagedRow['normalized'],
  sourceRecordKey: null, skipReason: null, outletName,
})
const day = (fields: Record<string, unknown>) => ({ salesDate: '2026-08-01', source: 'pos', feeLines: [], ...fields })

test('a day total is exact, not floating point', () => {
  const [total] = dailyTotals([
    staged('Greenlane', day({ netSales: '0.1' })),
    staged('Greenlane', day({ netSales: '0.2' })),
  ])
  assert.equal(total.amounts.netSales, '0.3')
  assert.equal(total.recordCount, 2)
})

test('an omitted field contributes nothing while an explicit null makes the day unknown', () => {
  const [omitted] = dailyTotals([staged('Greenlane', day({ netSales: '10' }))])
  assert.equal(omitted.amounts.tax, null)
  assert.equal(omitted.amounts.netSales, '10')

  const [unknown] = dailyTotals([
    staged('Greenlane', day({ netSales: '10', tax: '1' })),
    staged('Greenlane', day({ netSales: '10', tax: null })),
  ])
  assert.equal(unknown.amounts.netSales, '20')
  assert.equal(unknown.amounts.tax, null, 'one unknown tax must not leave a partial RM 1 total')
})

test('a stated zero is kept, and unusable rows are excluded rather than counted', () => {
  const [total] = dailyTotals([
    staged('Greenlane', day({ netSales: '0' })),
    staged('Greenlane', null),
    staged(null, day({ netSales: '99' })),
  ])
  assert.equal(total.amounts.netSales, '0')
  assert.equal(total.recordCount, 1)
})

test('outlet and date each start their own total', () => {
  const totals = dailyTotals([
    staged('Greenlane', day({ netSales: '10' })),
    staged('Greenlane', day({ salesDate: '2026-08-02', netSales: '20' })),
    staged('SS2', day({ netSales: '30' })),
  ])
  assert.equal(totals.length, 3)
  assert.deepEqual(
    totals.map(t => [t.outletName, t.salesDate, t.amounts.netSales]),
    [['Greenlane', '2026-08-01', '10'], ['Greenlane', '2026-08-02', '20'], ['SS2', '2026-08-01', '30']],
  )
})
