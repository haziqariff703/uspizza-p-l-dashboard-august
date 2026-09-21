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
const SHOPEE_HEADER = ['Store Name', 'Order ID', 'Complete Time', 'Order Status', 'Food original price', 'Item discounts', 'Surcharge fee', 'Transaction Amount', 'Earnings', 'Flash sale discount', 'Merchant Prepaid Subsidy', 'Food Voucher Subsidy', 'Merchant Group Order Frame Discount Subsidy', 'Food Direct Discount', 'Platform Flash Sale Subsidy']
const shopeeOrder = (store: string, price: number, earnings: number, orderId: string = 'O1') =>
  [store, orderId, '01/08/2026', 'Completed', price, 0, 0, price, earnings, 0, 0, 0, 0, 0, 0]

test('Shopee calculates SST at 6% inside the tax-inclusive transaction amount', async () => {
  const { staged } = await parse([SHOPEE_HEADER, shopeeOrder('US Pizza - Greenlane', 100, 78)], 'Shopee')
  const [row] = used(staged)
  assert.equal(row.normalized.grossSales, '100')
  assert.equal(row.normalized.tax, '5.66', '100 × 6 ÷ 106')
  assert.equal(row.normalized.netSales, '94.34')
  assert.equal(row.normalized.discount, '5.66', 'gross − net, so the derivation foots')
  assert.equal(row.normalized.serviceCharge, '0')
  assert.equal(row.normalized.payout, '78')
  assert.equal(row.normalized.platformFees, '22', 'collected − payout')
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
test('a missing SST column is calculated at 6%, and the gap is still reported', async () => {
  const header = ['Outlet Name', 'Order Date', 'Order Code', 'Products Value Paid By Customer', 'Restaurant Revenue', 'Payable Amount']
  const parsed = await parse([header, ['US Pizza - Ampang', '01/08/2026', 'OC1', 200, 150, 140]], 'FoodPanda')
  const [row] = used(parsed.staged)
  assert.equal(row.normalized.grossSales, '200')
  assert.equal(row.normalized.tax, '8.49', '150 × 6 ÷ 106')
  assert.equal(row.normalized.netSales, '141.51')
  assert.equal(row.normalized.discount, '58.49')
  assert.equal(row.normalized.platformFees, '10')
  // The calculation does not hide that the file had no tax column.
  assert.ok(parsed.issues.some(i => i.code === 'missing_column' && /SST On Restaurant Revenue/.test(i.message)))
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
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Net Sales', 'Total', 'Amount', 'Tax on Order Value', 'Restaurant Service Charge']
  const parsed = await parse([header,
    ['US Pizza - SS2', '01/08/2026', 'T1', 'Payment', 100, 90, null, '5.66', 0],
    ['US Pizza - SS2', '01/08/2026', 'T1', 'Advertisement', null, null, -12.5, null],
  ], 'Grab')
  assert.deepEqual(parsed.staged.map(r => r.sourceRecordKey), ['T1|Payment', 'T1|Advertisement'])
  const [payment, advert] = used(parsed.staged)
  assert.equal(payment.normalized.netSales, '94.34')
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

test('Grab separates actual order amount, signed promotions, customer tax and service charge', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Amount', 'Net Sales', 'Total', 'Tax on Order Value', 'Restaurant Service Charge', 'Offer', 'Discount (Merchant-Funded)']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'G1', 'Payment', '81.12', '65.05', '47.16', '3.68', null, null, '-19.75']], 'Grab')
  const { normalized } = used(parsed.staged)[0]
  assert.equal(normalized.grossSales, '81.12')
  assert.equal(normalized.discount, '19.75')
  assert.equal(normalized.netSales, '61.37')
  assert.equal(normalized.serviceCharge, '0')
  assert.equal(normalized.tax, '3.68')
  assert.equal(normalized.platformFees, '17.89')
})

test('Foodpanda reads restaurant SST separately from commission SST', async () => {
  const header = ['Outlet Name', 'Order Date', 'Order Code', 'Products Value Paid By Customer', 'Voucher Paid By Vendor', 'Discount Paid By Vendor', 'Restaurant Revenue', 'SST On Restaurant Revenue', 'foodpanda Commission', 'SST on foodpanda commission', 'Payable Amount']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'F1', '42.90', '6.50', '10.12', '26.28', '1.49', '4.96', '0.40', '20.92']], 'FoodPanda')
  const { normalized } = used(parsed.staged)[0]
  assert.equal(normalized.grossSales, '42.90')
  assert.equal(normalized.netSales, '24.79', 'reported SST wins over a 6% calculation')
  assert.equal(normalized.tax, '1.49')
  // The whole customer reduction, so gross − discount = net holds. The itemised
  // vendor voucher and discount total 16.62 on the tax-inclusive basis.
  assert.equal(normalized.discount, '18.11')
  assert.equal(normalized.serviceCharge, '0')
  assert.equal(normalized.platformFees, '5.36')
})

test('every platform derivation foots from gross sales to settlement', async () => {
  const grab = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Amount', 'Net Sales', 'Total', 'Tax on Order Value', 'Restaurant Service Charge', 'Offer', 'Discount (Merchant-Funded)']
  const foodpanda = ['Outlet Name', 'Order Date', 'Order Code', 'Products Value Paid By Customer', 'Restaurant Revenue', 'SST On Restaurant Revenue', 'Payable Amount']
  const cases: Array<[SalesSource, unknown[][]]> = [
    ['Grab', [grab, ['US Pizza - SS2', '01/08/2026', 'G1', 'Payment', '81.12', '65.05', '47.16', '3.68', null, null, '-19.75']]],
    ['FoodPanda', [foodpanda, ['US Pizza - SS2', '01/08/2026', 'F1', '42.90', '26.28', '1.49', '20.92']]],
    ['Shopee', [SHOPEE_HEADER, shopeeOrder('US Pizza - SS2', 45.84, 20)]],
  ]
  for (const [source, rows] of cases) {
    const { normalized } = used((await parse(rows, source)).staged)[0]
    const n = (key: string) => Number(normalized[key])
    assert.ok(Math.abs(n('grossSales') - n('discount') - n('netSales')) < 0.005,
      `${source}: gross − discount = net`)
    const collected = n('netSales') + n('serviceCharge') + n('tax')
    assert.ok(Math.abs(collected - n('platformFees') - n('payout')) < 0.005,
      `${source}: net + SC + SST − fees = payout`)
  }
})

// The app reports one combined charges column, verified against August: every
// dine-in order charges 16% of order value and no pickup or delivery order does.
const APPS_HEADER = ['Outlet Name', 'Order Date', 'Order ID', 'Status', 'Payment Status', 'Subtotal (RM)', 'Tax (RM)', 'Grand Total (RM)', 'Delivery Fee (RM)']
const appsOrder = (id: string, subtotal: number, charges: number, grandTotal: number, deliveryFee = 0) =>
  ['US Pizza - SS2', '01/08/2026', id, 'Completed', 'Paid', subtotal, charges, grandTotal, deliveryFee]

test('a dine-in order splits its combined charges into 10% service charge and 6% SST', async () => {
  const parsed = await parse([APPS_HEADER, appsOrder('A1', 33.06, 5.29, 38.35)], 'Apps')
  const { normalized } = used(parsed.staged)[0]
  assert.equal(normalized.netSales, '33.06', 'grand total less charges and delivery')
  assert.equal(normalized.serviceCharge, '3.31', '10% of 33.06')
  assert.equal(normalized.tax, '1.98', '6% of 33.06, and the remainder of the stated column')
  // The split never loses or invents a sen against the column it came from.
  assert.equal(Number(normalized.serviceCharge) + Number(normalized.tax), 5.29)
  assert.equal(normalized.payout, null, 'an order grand total is not a bank settlement')
})
test('a pickup or delivery order carries SST only, with no service charge', async () => {
  const parsed = await parse([APPS_HEADER,
    appsOrder('A1', 80.36, 4.82, 85.2),
    appsOrder('A2', 45.1, 3.01, 53.1, 5),
  ], 'Apps')
  const [pickup, delivery] = used(parsed.staged).map(row => row.normalized)
  assert.equal(pickup.serviceCharge, '0')
  assert.equal(pickup.tax, '4.82')
  // Delivery fee is taxed but is not merchant sales, so it leaves net sales.
  assert.equal(delivery.netSales, '45.09')
  assert.equal(delivery.serviceCharge, '0')
  assert.equal(delivery.tax, '3.01')
})
test('an order charging neither SST nor service charge records both as a stated zero', async () => {
  const parsed = await parse([APPS_HEADER, appsOrder('A1', 55, 0, 55)], 'Apps')
  const { normalized } = used(parsed.staged)[0]
  assert.equal(normalized.serviceCharge, '0')
  assert.equal(normalized.tax, '0')
})
test('charges matching no contractual rate stay unknown rather than being split', async () => {
  const parsed = await parse([APPS_HEADER, appsOrder('A1', 100, 12, 112)], 'Apps')
  const { normalized } = used(parsed.staged)[0]
  assert.equal(normalized.netSales, '100')
  assert.equal(normalized.serviceCharge, null)
  assert.equal(normalized.tax, null)
})
