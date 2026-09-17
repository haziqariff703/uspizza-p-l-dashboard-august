import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateSalesImport } from './salesImportValidation'
import type { ParsedImport, ParseIssue } from './salesImportParser'
import type { DailyTotal } from './salesDailyTotals'

const parsed = (issues: ParseIssue[] = [], stagedCount = 1): ParsedImport => ({
  sheetName: 'Sheet1', headerRowNumber: 1, parserVersion: 'test', mappingVersion: 'test',
  staged: Array.from({ length: stagedCount }, (_, index) => ({
    sourceRowNumber: index + 1, raw: {}, normalized: null, sourceRecordKey: null, skipReason: null, outletName: 'Greenlane',
  })),
  previewDaily: [], issues,
})

const total = (overrides: Partial<DailyTotal> = {}): DailyTotal => ({
  outletName: 'Greenlane', salesDate: '2026-08-01', recordCount: 3,
  amounts: {
    grossSales: '100.50', discount: null, netSales: '80', tax: null,
    serviceCharge: null, platformFees: null, advertisingSpend: null, payout: null,
  },
  ...overrides,
})

test('a well-formed file passes with nulls left as nulls', () => {
  const result = validateSalesImport(parsed(), [total()], 'POS', '2026-08')
  assert.equal(result.ok, true)
  assert.deepEqual(result.fatal, [])
})

test('a file that produced no daily totals is refused before anything is written', () => {
  const result = validateSalesImport(parsed(), [], 'Grab', '2026-08')
  assert.equal(result.ok, false)
  assert.ok(result.fatal.some(item => item.code === 'no_usable_rows'))
})

test('a total dated outside the reporting month is fatal, never filed under the wrong month', () => {
  const result = validateSalesImport(parsed(), [total({ salesDate: '2026-07-31' })], 'POS', '2026-08')
  assert.equal(result.ok, false)
  assert.ok(result.fatal.some(item => item.code === 'date_outside_month'))
})

test('a money value that is not an exact decimal is fatal', () => {
  const broken = total()
  broken.amounts.netSales = 'RM 1,234.50'
  const result = validateSalesImport(parsed(), [broken], 'POS', '2026-08')
  assert.equal(result.ok, false)
  assert.ok(result.fatal.some(item => item.code === 'bad_amount'))
})

test('POS having no transaction key is a warning, not a refusal', () => {
  // It was fatal to the retired publication contract. The simple schema keeps
  // daily totals and has no approval step, so POS stays importable.
  const posIssue: ParseIssue = { severity: 'error', code: 'no_source_record_key', message: 'POS has no key.' }
  const result = validateSalesImport(parsed([posIssue]), [total()], 'POS', '2026-08')
  assert.equal(result.ok, true)
  assert.ok(result.warnings.some(item => item.code === 'no_source_record_key'))
})

test('an unreadable layout reported by the parser is fatal', () => {
  const structural: ParseIssue = { severity: 'error', code: 'unreadable_layout', message: 'Columns not found.' }
  const result = validateSalesImport(parsed([structural]), [total()], 'Grab', '2026-08')
  assert.equal(result.ok, false)
  assert.ok(result.fatal.some(item => item.code === 'unreadable_layout'))
})

test('an unsupported source and a malformed month are both refused', () => {
  const result = validateSalesImport(parsed(), [total()], 'Deliveroo' as never, '2026-8')
  assert.equal(result.ok, false)
  assert.ok(result.fatal.some(item => item.code === 'unsupported_source'))
  assert.ok(result.fatal.some(item => item.code === 'bad_reporting_month'))
})

test('a daily total with no countable source rows is refused', () => {
  const result = validateSalesImport(parsed(), [total({ recordCount: 0 })], 'POS', '2026-08')
  assert.equal(result.ok, false)
  assert.ok(result.fatal.some(item => item.code === 'bad_record_count'))
})
