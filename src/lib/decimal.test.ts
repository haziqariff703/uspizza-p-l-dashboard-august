import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addAmounts, amount, amountsToJson, AMOUNT_ABSENT, AMOUNT_UNKNOWN, parseDecimal, subtractAmounts } from './decimal'

// app_private.sales_amount accepts only this shape; anything else aborts publication.
const CONTRACT = /^-?[0-9]+(\.[0-9]+)?$/

test('source cells become canonical decimal strings the database will accept', () => {
  assert.equal(parseDecimal('RM 1,234.50'), '1234.50')
  assert.equal(parseDecimal('(123.45)'), '-123.45')
  assert.equal(parseDecimal('  -8.00 '), '-8.00')
  assert.equal(parseDecimal(0), '0')
  assert.equal(parseDecimal(5.4), '5.4')
  for (const cell of ['RM 1,234.50', '(123.45)', '-8.00', 0, 5.4]) {
    assert.match(parseDecimal(cell)!, CONTRACT)
  }
})
test('a cell with nothing usable is not a zero', () => {
  for (const cell of [null, undefined, '', '   ', 'N/A', '-', 'pending', Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.equal(parseDecimal(cell), undefined, `${String(cell)} must not parse`)
  }
})

test('money is added exactly, without floating-point drift', () => {
  // 0.1 + 0.2 is 0.30000000000000004 in JavaScript.
  assert.deepEqual(addAmounts(amount('0.1'), amount('0.2')), amount('0.3'))
  assert.deepEqual(addAmounts(amount('1234.56'), amount('0.444')), amount('1235.004'))
  assert.deepEqual(subtractAmounts(amount('100'), amount('90')), amount('10'))
  // Credits keep their sign; nothing is clipped at zero.
  assert.deepEqual(subtractAmounts(amount('90'), amount('100')), amount('-10'))
})
test('an unknown input makes the result unknown rather than a partial sum', () => {
  assert.deepEqual(addAmounts(amount('10'), AMOUNT_UNKNOWN), AMOUNT_UNKNOWN)
  assert.deepEqual(subtractAmounts(amount('10'), AMOUNT_UNKNOWN), AMOUNT_UNKNOWN)
  // Deriving from something the source never stated is not a figure.
  assert.deepEqual(subtractAmounts(AMOUNT_ABSENT, amount('10')), AMOUNT_UNKNOWN)
})
test('adding nothing at all contributes nothing, rather than reporting zero', () => {
  assert.deepEqual(addAmounts(AMOUNT_ABSENT, AMOUNT_ABSENT), AMOUNT_ABSENT)
})

test('the three states map onto the JSON contract distinctly', () => {
  const json = amountsToJson({
    grossSales: amount('100.00'),
    tax: AMOUNT_UNKNOWN,
    advertisingSpend: AMOUNT_ABSENT,
  })
  assert.equal(json.grossSales, '100.00')
  // Applicable but unknown: present, null.
  assert.ok('tax' in json)
  assert.equal(json.tax, null)
  // No contribution at all: the key is absent, so it is not counted as applicable.
  assert.equal('advertisingSpend' in json, false)
})
