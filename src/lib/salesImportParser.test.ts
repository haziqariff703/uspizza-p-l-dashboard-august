import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as XLSX from 'xlsx'
import { parseSalesFile, SOURCE_PROFILES, type NormalizedRow, type SalesSource } from './salesImportParser'

const workbookFile = (sheets: Record<string, unknown[][]>) => {
  const book = XLSX.utils.book_new()
  for (const [name, rows] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), name)
  }
  return new File([XLSX.write(book, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer], 'report.xlsx')
}
const parse = (rows: unknown[][], source: SalesSource, month = '2026-08') => parseSalesFile(workbookFile({ Sheet1: rows }), source, month)
const used = (staged: Array<{ normalized: NormalizedRow | null }>) =>
  staged.filter((row): row is { normalized: NormalizedRow } => row.normalized !== null)

// Columns taken from the real August export (IMPLEMENTATION_CHECKLIST.md section 7).
const SHOPEE_HEADER = ['Store Name', 'Order ID', 'Complete Time', 'Order Status', 'Food original price', 'Item discounts', 'Surcharge fee', 'Transaction Amount', 'Earnings']
const shopeeOrder = (store: string, price: number, earnings: number, orderId: string = 'O1') =>
  [store, orderId, '01/08/2026', 'Completed', price, 0, 0, price, earnings]

test('Shopee records SST, service charge and commission as explicitly unknown, never zero', async () => {
  const { staged } = await parse([SHOPEE_HEADER, shopeeOrder('US Pizza - Greenlane', 100, 78)], 'Shopee')
  const [row] = used(staged)
  assert.equal(row.normalized.grossSales, '100')
  assert.equal(row.normalized.payout, '78')
  // Present-but-null is the contract's "applicable but unknown".
  for (const key of ['tax', 'serviceCharge', 'platformFees', 'discount', 'netSales']) {
    assert.ok(key in row.normalized, `${key} must be present`)
    assert.equal(row.normalized[key], null, `${key} must be unknown, not a number`)
  }
})
test('Shopee keeps a name the brand gate used to drop, and still rejects sister brands', async () => {
  const { staged } = await parse([SHOPEE_HEADER,
    shopeeOrder('ST Rosyam Mall Klang', 50, 40, 'A1'),
    shopeeOrder('The Manhattan FISH MARKET - Greenlane', 90, 70, 'A2'),
  ], 'Shopee')
  assert.equal(used(staged).length, 1)
  assert.equal(staged.length, 2, 'the sister-brand row is still staged, not dropped')
  assert.match(staged[1].skipReason!, /[Ss]ister brand/)
})
test('a column missing from the export is unknown rather than zero', async () => {
  const header = ['Outlet Name', 'Order Date', 'Order Code', 'Products Value Paid By Customer', 'Restaurant Revenue', 'Payable Amount']
  const parsed = await parse([header, ['US Pizza - Ampang', '01/08/2026', 'OC1', 200, 150, 140]], 'FoodPanda')
  const [row] = used(parsed.staged)
  assert.equal(row.normalized.grossSales, '200')
  assert.equal(row.normalized.netSales, '150')
  // No commission, voucher or discount columns in this file.
  assert.equal(row.normalized.platformFees, null)
  assert.equal(row.normalized.discount, null)
  assert.ok(parsed.issues.some(i => i.code === 'missing_column' && /foodpanda Commission/.test(i.message)))
})

test('the header row is found rather than assumed to be row 1', async () => {
  const parsed = await parse([
    ['ShopeeFood merchant report'],
    ['Generated 01/09/2026'],
    [],
    SHOPEE_HEADER,
    shopeeOrder('US Pizza - SS2', 100, 78),
  ], 'Shopee')
  assert.equal(parsed.headerRowNumber, 4)
  assert.equal(used(parsed.staged).length, 1)
})
test('the table is found even when it is not on the first sheet', async () => {
  const parsed = await parseSalesFile(workbookFile({
    Cover: [['Summary'], ['Nothing here']],
    Orders: [SHOPEE_HEADER, shopeeOrder('US Pizza - SS2', 100, 78)],
  }), 'Shopee', '2026-08')
  assert.equal(parsed.sheetName, 'Orders')
  assert.equal(used(parsed.staged).length, 1)
})
test('an unrecognised layout stops instead of importing nothing silently', async () => {
  await assert.rejects(
    () => parse([['Some', 'Other', 'Report'], [1, 2, 3]], 'Shopee'),
    /No header row found.*Complete Time/s,
  )
})

test('every source row is staged, including the ones the profile cannot use', async () => {
  const parsed = await parse([
    SHOPEE_HEADER,
    shopeeOrder('US Pizza - SS2', 100, 78, 'K1'),
    shopeeOrder('The Manhattan FISH MARKET - Greenlane', 90, 70, 'K2'),
    ['US Pizza - SS2', 'K3', '02/08/2026', 'Cancelled', 60, 0, 0, 60, 0],
  ], 'Shopee')

  assert.equal(parsed.staged.length, 3, 'one staged row per source row, none dropped')
  assert.deepEqual(parsed.staged.map(r => r.sourceRowNumber), [2, 3, 4])
  assert.equal(parsed.staged[0].skipReason, null)
  assert.match(parsed.staged[2].skipReason!, /Cancelled/)
  assert.equal(parsed.staged[2].raw['Order Status'], 'Cancelled')
  assert.equal(used(parsed.staged).length, 1)
})
test('POS heading rows are staged, and POS cannot produce a source key', async () => {
  const parsed = await parse([
    ['US Pizza'], ['Sales report'], [], [], [], [],
    ['01/08/2026'],
    ['001-US Pizza Kelana Jaya'], // real heading format, from datasource/_audit
    [null, 'Pizza', 100, 10, 90, 5.4, 9],
  ], 'POS')

  assert.equal(parsed.headerRowNumber, null, 'the POS report has no header row')
  assert.deepEqual(parsed.staged.map(r => r.skipReason), ['Date heading', 'Outlet heading', null])
  const [row] = used(parsed.staged)
  assert.equal(row.normalized.netSales, '90')
  assert.equal(row.normalized.tax, '5.4')
  // The grouped POS report identifies no transaction, so nothing is invented.
  assert.equal(parsed.staged[2].sourceRecordKey, null)
  assert.ok(parsed.issues.some(i => i.code === 'no_source_record_key' && i.severity === 'error'))
})

test('a stable source key comes from the transaction identity, not the row position', async () => {
  const parsed = await parse([SHOPEE_HEADER,
    shopeeOrder('US Pizza - SS2', 100, 78, 'ORDER-1'),
    shopeeOrder('US Pizza - SS2', 20, 15, 'ORDER-2'),
  ], 'Shopee')
  assert.deepEqual(parsed.staged.map(r => r.sourceRecordKey), ['ORDER-1', 'ORDER-2'])
  assert.equal(parsed.issues.filter(i => i.code === 'blank_source_record_key').length, 0)
})
test('a blank transaction identity is reported instead of being filled in', async () => {
  const parsed = await parse([SHOPEE_HEADER, shopeeOrder('US Pizza - SS2', 100, 78, '')], 'Shopee')
  assert.equal(parsed.staged[0].sourceRecordKey, null)
  const issue = parsed.issues.find(i => i.code === 'blank_source_record_key')
  assert.ok(issue && issue.severity === 'error')
})
test('Grab distinguishes a payment from an advertisement on the same transaction', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Net Sales', 'Total', 'Amount', 'Tax on Order Value']
  const parsed = await parse([header,
    ['US Pizza - SS2', '01/08/2026', 'T1', 'Payment', 100, 90, null, '5.66'],
    ['US Pizza - SS2', '01/08/2026', 'T1', 'Advertisement', null, null, -12.5, null],
  ], 'Grab')
  assert.deepEqual(parsed.staged.map(r => r.sourceRecordKey), ['T1|Payment', 'T1|Advertisement'])
  const [payment, advert] = used(parsed.staged)
  assert.equal(payment.normalized.netSales, '100')
  assert.equal(payment.normalized.platformFees, '10', 'exact subtraction, unclipped')
  assert.equal(payment.normalized.tax, '5.66')
  // An advertisement line is not order revenue, so those keys are absent entirely.
  assert.equal('netSales' in advert.normalized, false)
  assert.equal(advert.normalized.advertisingSpend, '-12.5', 'a credit keeps its sign')
})
test('Grab records commission as an itemised fee line rather than flattening it', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Net Sales', 'Total', 'Order commission']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'T9', 'Payment', 100, 90, '-8.00']], 'Grab')
  const [row] = used(parsed.staged)
  assert.deepEqual(row.normalized.feeLines, [
    { feeType: 'commission', amount: '-8.00', taxAmount: null, sourceLabel: 'Order commission' },
  ])
})
test('a profile column the file does not contain is reported, not silently zeroed', async () => {
  const header = ['Outlet Name', 'Order Date', 'Order Code', 'Products Value Paid By Customer', 'Restaurant Revenue', 'Payable Amount']
  const parsed = await parse([header, ['US Pizza - Ampang', '01/08/2026', 'OC1', 200, 150, 140]], 'FoodPanda')
  const reported = parsed.issues.filter(i => i.code === 'missing_column').length
  const present = SOURCE_PROFILES.FoodPanda.readsColumns.filter(column => header.includes(column)).length
  // Every declared column is either present or reported — none goes unaccounted.
  assert.equal(present + reported, SOURCE_PROFILES.FoodPanda.readsColumns.length)
})
test('a file with the full profile reports nothing missing', async () => {
  const parsed = await parse([SHOPEE_HEADER, shopeeOrder('US Pizza - SS2', 100, 78)], 'Shopee')
  assert.equal(parsed.issues.filter(i => i.code === 'missing_column').length, 0)
})
