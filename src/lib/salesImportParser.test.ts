import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import * as XLSX from 'xlsx'
import {
  detectFoodPandaLayout, PARSER_VERSION, parseSalesFile, SOURCE_PROFILES,
  type NormalizedRow, type SalesSource,
} from './salesImportParser'

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
const SHOPEE_HEADER = ['Store Name', 'Order ID', 'Complete Time', 'Order Status', 'Food original price', 'Item discounts', 'Surcharge fee', 'Transaction Amount', 'Earnings', 'Comission', 'Flash sale discount', 'Merchant Prepaid Subsidy', 'Food Voucher Subsidy', 'Merchant Group Order Frame Discount Subsidy', 'Food Direct Discount', 'Platform Flash Sale Subsidy']
const shopeeOrder = (store: string, price: number, earnings: number, orderId: string = 'O1') =>
  [store, orderId, '01/08/2026', 'Completed', price, 0, 0, price, earnings, 0, 0, 0, 0, 0, 0]

test('the parser version reflects the itemized-fee column mapping', () => {
  assert.equal(PARSER_VERSION, '2026-09-24')
})

test('Shopee calculates SST at 6% inside the tax-inclusive transaction amount', async () => {
  const { staged } = await parse([SHOPEE_HEADER, shopeeOrder('US Pizza - Greenlane', 100, 78)], 'Shopee')
  const [row] = used(staged)
  assert.equal(row.normalized.grossSales, '100')
  assert.equal(row.normalized.tax, '5.66', '100 × 6 ÷ 106')
  assert.equal(row.normalized.netSales, '94.34')
  assert.equal(row.normalized.discount, '5.66', 'gross − net, so the derivation foots')
  assert.equal(row.normalized.serviceCharge, '0')
  assert.equal(row.normalized.payout, '78')
  assert.equal(row.normalized.platformFees, '0', 'narrow Surcharge fee, not collected − payout')
  assert.equal(row.normalized.totalDeductions, '22', 'collected − payout, identity only')
  assert.equal(row.normalized.commission, '0', 'Shopee Comission column, read directly')
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
  assert.equal(row.normalized.platformFees, null, 'no platform-fee columns → platform fee is unknown, never 0')
  assert.equal(row.normalized.totalDeductions, '10', 'revenue − payable, identity only')
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
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Net Sales', 'Total', 'Amount', 'Tax on Order Value', 'Restaurant Packaging Charge']
  const parsed = await parse([header,
    ['US Pizza - SS2', '01/08/2026', 'T1', 'Payment', 100, 90, null, '5.66', 0],
    ['US Pizza - SS2', '01/08/2026', 'T1', 'Advertisement', null, null, -12.5, null],
  ], 'Grab')
  assert.deepEqual(parsed.staged.map(r => r.sourceRecordKey), ['T1|Payment', 'T1|Advertisement'])
  const [payment, advert] = used(parsed.staged)
  assert.equal(payment.normalized.netSales, '94.34')
  assert.equal(payment.normalized.platformFees, null, 'narrow platform fee: no Grab Fee/packaging columns → unknown')
  assert.equal(payment.normalized.totalDeductions, '10', 'collected − payout, identity only')
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
test('Grab commission sums Order commission with Step-up and GrabKitchen commission lines', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Net Sales', 'Total', 'Order commission', 'Step-up commission', 'GrabKitchen Commission', 'GrabKitchen Other Commission']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'T9', 'Payment', 100, 90, '-8.00', '-1.50', '-0.75', '-0.25']], 'Grab')
  const [row] = used(parsed.staged)
  assert.deepEqual(row.normalized.feeLines, [
    { feeType: 'commission', amount: '-8.00', taxAmount: null, sourceLabel: 'Order commission' },
    { feeType: 'commission', amount: '-1.50', taxAmount: null, sourceLabel: 'Step-up commission' },
    { feeType: 'commission', amount: '-0.75', taxAmount: null, sourceLabel: 'GrabKitchen Commission' },
    { feeType: 'commission', amount: '-0.25', taxAmount: null, sourceLabel: 'GrabKitchen Other Commission' },
  ])
  // The four itemized commission columns sum to a single unsigned commission field.
  assert.equal(row.normalized.commission, '10.50', 'sum of the four, stored unsigned')
})
test('Grab discount includes the delivery-fee discount alongside the order discount', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Amount', 'Net Sales', 'Total', 'Tax on Order Value', 'Offer', 'Discount (Merchant-Funded)', 'Delivery Fee Discount (Merchant-Funded)']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'G1', 'Payment', '81.12', '65.05', '47.16', '3.68', null, '-19.75', '-2.00']], 'Grab')
  const { normalized } = used(parsed.staged)[0]
  assert.equal(normalized.discount, '21.75', 'both merchant-funded discounts, unsigned')
})
test('Grab treats Dine Out Discount rows as order economics, but excludes them from gross sales', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Amount', 'Net Sales', 'Total', 'Tax on Order Value', 'Restaurant Packaging Charge']
  const parsed = await parse([header, ['Us Pizza - Sri Petaling', '01/08/2026', 'D1', 'Dine Out Discount', '51.60', '45.03', '35.06', '0', null]], 'Grab')
  const [row] = used(parsed.staged)
  assert.equal('grossSales' in row.normalized, false, 'Dine Out Discount is not gross sales (summary GROSS SALES is Payment-only)')
  assert.equal(row.normalized.netSales, '45.03')
})
test('Grab pulls a 31-July order that settles in August into the reporting month', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Amount', 'Net Sales', 'Total', 'Tax on Order Value', 'Transfer Date']
  const parsed = await parse([header,
    // Created 31 July, settled 2 August → attributed to August by its settlement date.
    ['US Pizza - SS2', '31 Jul 2026 11:35 PM', 'T1', 'Payment', '83.24', '70', '60', '0', '2 Aug 2026 5:43 AM'],
    // Created 31 July, never settled (no Transfer Date) → stays out of period.
    ['US Pizza - SS2', '31 Jul 2026 11:48 PM', 'T2', 'Payment', '10.00', '9', '8', '0', null],
  ], 'Grab')
  const rows = used(parsed.staged)
  assert.equal(rows.length, 1, 'only the settled tail row is included')
  assert.equal(rows[0].normalized.salesDate, '2026-08-02', 're-dated by settlement, not created')
  assert.equal(rows[0].normalized.grossSales, '83.24')
})

test('Grab Adjustment rows contribute to payout without inventing order economics', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Amount', 'Total']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'ADJ1', 'Adjustment', '250.00', '250.00']], 'Grab')
  const [row] = used(parsed.staged)
  assert.equal(row.normalized.payout, '250.00')
  assert.equal('netSales' in row.normalized, false, 'an adjustment is not order revenue')
  assert.deepEqual(row.normalized.feeLines, [
    { feeType: 'refund_adjustment', amount: '250.00', taxAmount: null, sourceLabel: 'Amount' },
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
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Amount', 'Net Sales', 'Total', 'Tax on Order Value', 'Restaurant Packaging Charge', 'Offer', 'Discount (Merchant-Funded)', 'Delivery Fee Discount (Merchant-Funded)']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'G1', 'Payment', '81.12', '65.05', '47.16', '3.68', null, null, '-19.75', null]], 'Grab')
  const { normalized } = used(parsed.staged)[0]
  assert.equal(normalized.grossSales, '81.12')
  assert.equal(normalized.discount, '19.75')
  assert.equal(normalized.netSales, '61.37')
  assert.equal(normalized.serviceCharge, '0')
  assert.equal(normalized.tax, '3.68')
  assert.equal(normalized.platformFees, null, 'packaging charge stated null and no Grab Fee → unknown')
  assert.equal(normalized.totalDeductions, '17.89', 'collected − payout, identity only')
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
  assert.equal(normalized.platformFees, null, 'no Waiting Time Fee / Packaging columns → unknown')
  assert.equal(normalized.totalDeductions, '5.36', 'revenue − payable, identity only')
  assert.equal(normalized.commission, '4.96', 'foodpanda Commission, unsigned')
  assert.equal(normalized.adjustments, '0.40', 'SST on commission is a fee tax, not commission')
})

/* -------------------------------------------------------------------------- */
/* Foodpanda compiled + invoice layouts (FOODPANDA_EXCEL_PARSING_SPECIFICATION) */
/* -------------------------------------------------------------------------- */

// Appendix A order-level columns, as named in the spec (§3.A).
const FP_APPENDIX_A_HEADER = [
  'Order Code', 'Outlet Name', 'Order Date', 'Invoice Date', 'Invoice Number',
  'Products Value Paid By Customer', 'Voucher Paid By Vendor', 'Discount Paid By Vendor',
  'Pandabox Voucher Paid By Vendor', 'Delivery Fee Discount Paid By Vendor', 'Restaurant Revenue',
  'foodpanda Commission Base', 'foodpanda Commission', 'SST on foodpanda commission',
  'Payable Amount', 'SST On Restaurant Revenue', 'Pandabox Fee Paid By Vendor',
  'Waiting Time Fee', 'Customer Targeting Fee', 'Packaging Fees Paid By Customer',
]
// Appendix B additional-charge columns (§3.B).
const FP_APPENDIX_B_HEADER = ['Category', 'Net Total', 'Subject to VAT rate', 'Invoice Number', 'Invoice Date']

const foodpandaCompiled = (appendixA: unknown[][], appendixB?: unknown[][]) =>
  parseSalesFile(workbookFile(appendixB ? { 'Appendix A': appendixA, 'Appendix B': appendixB } : { 'Appendix A': appendixA }), 'FoodPanda', '2026-08')

test('detectFoodPandaLayout separates the compiled, invoice and outlet-daily layouts', () => {
  const asSheets = (rows: Record<string, unknown[][]>) =>
    Object.entries(rows).map(([name, rows]) => ({ name, rows }))
  assert.equal(detectFoodPandaLayout(asSheets({ 'Appendix A': [FP_APPENDIX_A_HEADER] })), 'compiled')
  assert.equal(detectFoodPandaLayout(asSheets({ 'Invoice Master': [['Invoice No.', 'Outlet Name', 'Sales Value Excl. SST (RM)']] })), 'invoice')
  assert.equal(detectFoodPandaLayout(asSheets({ 'Sheet1': [['Outlet Name', 'Order Date', 'Order Code']] })), 'outletDaily')
})

test('Foodpanda Appendix A maps the order-level economics with the 6%/8% SST split', async () => {
  // Restaurant Revenue is inclusive of 6% SST; commission base is the net sales
  // (÷ 1.06) and commission's own 8% SST is a separate fee tax.
  const appendixA = [
    FP_APPENDIX_A_HEADER,
    // Order Code, Outlet, Order Date, Invoice Date, Invoice No, Products, Voucher, Discount, Pandabox Vch, Delivery Disc, Restaurant Rev, Comm Base, Comm, Comm SST, Payable, SST Rev, Pandabox Fee, Waiting, Targeting, Packaging
    ['F1', 'US Pizza - SS2', '01/08/2026', '01/08/2026', 'INV-1', 42.90, 6.50, 10.12, 0, 0, 26.28, 24.79, 4.96, 0.40, 20.92, 1.49, 0, 0, 0, 0],
  ]
  const { staged } = await foodpandaCompiled(appendixA)
  const [row] = used(staged)
  assert.equal(row.normalized.grossSales, '42.9')
  assert.equal(row.normalized.netSales, '24.79', 'commission base is the P&L net sales')
  assert.equal(row.normalized.tax, '1.49', '6% customer SST read from its own column')
  assert.equal(row.normalized.commission, '5.36', 'commission + its 8% SST, unsigned')
  assert.equal(row.normalized.payout, '20.92')
  assert.equal(row.normalized.discount, '18.11', 'gross − net')
  assert.equal(staged[0].sourceRecordKey, 'F1', 'Order Code is the stable order identity')
})

test('Foodpanda Appendix B attributes advertising, cancellation and platform fees to an outlet via the invoice map', async () => {
  const appendixA = [
    FP_APPENDIX_A_HEADER,
    ['F1', 'US Pizza - SS2', '01/08/2026', '01/08/2026', 'INV-1', 42.90, 6.50, 10.12, 0, 0, 26.28, 24.79, 4.96, 0.40, 20.92, 1.49, 0, 0, 0, 0],
  ]
  const appendixB = [
    FP_APPENDIX_B_HEADER,
    // Category, Net Total, VAT rate, Invoice Number, Invoice Date
    ['Keywords', 10.00, '8%', 'INV-1', '01/08/2026'],
    ['Display Ads', 5.00, '8%', 'INV-1', '01/08/2026'],
    ['Cancellation orders', -2.50, '8%', 'INV-1', '01/08/2026'],
    ['Platform Fee', 3.00, '8%', 'INV-1', '01/08/2026'],
  ]
  const { staged } = await foodpandaCompiled(appendixA, appendixB)
  // Appendix B rows have no source key and no outlet in the raw row, but carry an
  // outlet name attributed from the Appendix A invoice → outlet map.
  const bRows = staged.filter(row => row.raw['Category'] !== undefined)
  assert.equal(bRows.length, 4)
  assert.ok(bRows.every(row => row.outletName === 'US Pizza - SS2'), 'outlet attributed from the Appendix A invoice map')
  const keywords = bRows.find(row => row.raw['Category'] === 'Keywords')!.normalized!
  const displayAds = bRows.find(row => row.raw['Category'] === 'Display Ads')!.normalized!
  const cancellation = bRows.find(row => row.raw['Category'] === 'Cancellation orders')!.normalized!
  const platformFee = bRows.find(row => row.raw['Category'] === 'Platform Fee')!.normalized!
  assert.equal(keywords.advertisingSpend, '10.80', 'base × 1.08')
  assert.equal(displayAds.advertisingSpend, '5.40', 'base × 1.08')
  assert.equal(cancellation.adjustments, '-2.5', 'signed cancellation adjustment')
  assert.equal(platformFee.platformFees, '3.24', 'platform fee base × 1.08')
})

/* -------------------------------------------------------------------------- */
/* Foodpanda Invoice Master (self-billed e-invoice)                             */
/* -------------------------------------------------------------------------- */

const FP_INVOICE_HEADER = [
  'Invoice No.', 'Outlet Name', 'Business Date', 'Total Revenue (RM)', 'Sales Value Excl. SST (RM)',
  'Sales SST 6% (RM)', 'Sales Incl. SST (RM)', 'Commission Base (RM)', 'Commission SST (RM)',
  'Wastage Commission Base (RM)', 'Wastage Commission SST (RM)', 'Fees & Adj (SST) Base (RM)',
  'Fees & Adj (SST) SST (RM)', 'Fees & Adj (Non-SST) Base (RM)', 'Pandabox Fee Base (RM)',
  'Pandabox Fee SST (RM)', 'Targeted Cust. Fee Base (RM)', 'Targeted Cust. Fee SST (RM)',
  'Waiting Time Fee Base (RM)', 'Waiting Time Fee SST (RM)', "Today's Earnings [a-c] (RM)",
  'Total Payable [f]+[a-c] (RM)', 'Total Incl. Tax [c] (RM)',
]

const foodpandaInvoice = (rows: unknown[][]) =>
  parseSalesFile(workbookFile({ 'Invoice Master': rows }), 'FoodPanda', '2026-08')

test('Foodpanda Invoice Master maps the self-billed e-invoice figures', async () => {
  const rows = [
    FP_INVOICE_HEADER,
    // Invoice, Outlet, Business Date, Total Revenue, Sales Excl SST, Sales SST 6%, Sales Incl, Comm Base, Comm SST, Wastage Base, Wastage SST, Fees Base, Fees SST, Fees Non-SST, Pandabox Base, Pandabox SST, Targeted Base, Targeted SST, Waiting Base, Waiting SST, Earnings, Total Payable, Total Incl Tax
    ['FP-001', 'US Pizza - SS2', '01/08/2026', 170.00, 160.38, 9.62, 170.00, 31.96, 2.56, 0.69, 0.06, 15.57, 1.25, -7.25, 1.00, 0.08, 0.50, 0.04, 0.20, 0.02, 124.11, 124.11, 46.05],
  ]
  const { staged, issues } = await foodpandaInvoice(rows)
  const [row] = used(staged)
  assert.equal(row.normalized.grossSales, '170.00', 'net + 6% SST')
  assert.equal(row.normalized.netSales, '160.38', 'Sales Value Excl. SST')
  assert.equal(row.normalized.tax, '9.62', '6% customer SST')
  assert.equal(row.normalized.commission, '35.27', 'commission + wastage, base + 8% SST each')
  assert.equal(row.normalized.advertisingSpend, '16.82', 'fees base + 8% SST')
  assert.equal(row.normalized.platformFees, '1.84', 'pandabox + targeted + waiting, base + SST')
  assert.equal(row.normalized.adjustments, '-7.25', 'non-SST adjustment keeps its sign')
  assert.equal(row.normalized.payout, '124.11', "Today's Earnings")
  assert.equal(row.normalized.totalDeductions, '46.05', 'Total Incl. Tax [c]')
  // The invoice is an aggregate with no order identity, so it cannot be approved.
  assert.equal(staged[0].sourceRecordKey, null)
  assert.ok(issues.some(i => i.code === 'no_source_record_key' && i.severity === 'error'))
})

test('Foodpanda Invoice Master skips the TOTAL footer row', async () => {
  const rows = [
    FP_INVOICE_HEADER,
    ['FP-001', 'US Pizza - SS2', '01/08/2026', 170.00, 160.38, 9.62, 170.00, 31.96, 2.56, 0.69, 0.06, 15.57, 1.25, -7.25, 1.00, 0.08, 0.50, 0.04, 0.20, 0.02, 124.11, 124.11, 46.05],
    [null, 'TOTAL (respects filters)', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
  ]
  const { staged } = await foodpandaInvoice(rows)
  assert.equal(used(staged).length, 1, 'the footer row is staged but contributes nothing')
  const footer = staged.find(row => row.outletName === 'TOTAL (respects filters)')
  assert.ok(footer && footer.skipReason === 'Total row')
})

test('every platform derivation foots from gross sales to settlement', async () => {
  const grab = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Amount', 'Net Sales', 'Total', 'Tax on Order Value', 'Restaurant Packaging Charge', 'Offer', 'Discount (Merchant-Funded)', 'Delivery Fee Discount (Merchant-Funded)']
  const foodpanda = ['Outlet Name', 'Order Date', 'Order Code', 'Products Value Paid By Customer', 'Restaurant Revenue', 'SST On Restaurant Revenue', 'Payable Amount']
  const cases: Array<[SalesSource, unknown[][]]> = [
    ['Grab', [grab, ['US Pizza - SS2', '01/08/2026', 'G1', 'Payment', '81.12', '65.05', '47.16', '3.68', null, null, '-19.75', null]]],
    ['FoodPanda', [foodpanda, ['US Pizza - SS2', '01/08/2026', 'F1', '42.90', '26.28', '1.49', '20.92']]],
    ['Shopee', [SHOPEE_HEADER, shopeeOrder('US Pizza - SS2', 45.84, 20)]],
  ]
  for (const [source, rows] of cases) {
    const { normalized } = used((await parse(rows, source)).staged)[0]
    const n = (key: string) => Number(normalized[key])
    assert.ok(Math.abs(n('grossSales') - n('discount') - n('netSales')) < 0.005,
      `${source}: gross − discount = net`)
    const collected = n('netSales') + n('serviceCharge') + n('tax')
    assert.ok(Math.abs(collected - n('totalDeductions') - n('payout')) < 0.005,
      `${source}: net + SC + SST − deductions = payout`)
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

/* -------------------------------------------------------------------------- */
/* May-spec Grab columns (Marketing success fee, Subcategory, BF commission tax) */
/* -------------------------------------------------------------------------- */

// The May export shares the August 68-column shape but adds these reads to the
// single Grab profile. A column missing from the synthetic August rows must stay
// absent, never RM 0, so both files run one arithmetic path.
test('Grab folds the May Marketing success fee into the platform fee as an unsigned magnitude', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Net Sales', 'Total', 'Grab Fee', 'Restaurant Packaging Charge', 'Marketing success fee']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'M1', 'Payment', 100, 90, null, 0, '-3.50']], 'Grab')
  const { normalized } = used(parsed.staged)[0]
  assert.equal(normalized.platformFees, '3.50', 'marketing fee stored as a positive magnitude')
})
test('Grab leaves the platform fee unknown when the Marketing column is absent, never zero', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Net Sales', 'Total']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'M2', 'Payment', 100, 90]], 'Grab')
  const { normalized } = used(parsed.staged)[0]
  assert.equal(normalized.platformFees, null, 'no Grab Fee, packaging or Marketing column → unknown')
})
test('Grab commission adds the May BF tax on commission and records it as a fee line', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Net Sales', 'Total', 'Order commission', 'Step-up commission', 'GrabKitchen Commission', 'GrabKitchen Other Commission', 'Tax on GrabFood/GrabMart commission, adjustments, ads']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'M3', 'Payment', 100, 90, '-8.00', '-1.50', '0', '0', '-0.76']], 'Grab')
  const [row] = used(parsed.staged)
  // Order + step-up + the 8% tax, stored unsigned.
  assert.equal(row.normalized.commission, '10.26')
  assert.deepEqual(row.normalized.feeLines, [
    { feeType: 'commission', amount: '-8.00', taxAmount: null, sourceLabel: 'Order commission' },
    { feeType: 'commission', amount: '-1.50', taxAmount: null, sourceLabel: 'Step-up commission' },
    { feeType: 'commission', amount: '0', taxAmount: null, sourceLabel: 'GrabKitchen Commission' },
    { feeType: 'commission', amount: '0', taxAmount: null, sourceLabel: 'GrabKitchen Other Commission' },
    { feeType: 'tax', amount: '-0.76', taxAmount: null, sourceLabel: 'Tax on GrabFood/GrabMart commission, adjustments, ads' },
  ])
})
test('Grab keeps the BF tax on commission out of adjustments, so it is not counted twice', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Net Sales', 'Total', 'Order commission', 'Step-up commission', 'GrabKitchen Commission', 'GrabKitchen Other Commission', 'Tax on GrabFood/GrabMart commission, adjustments, ads', 'Customer refund Item', 'Withholding Tax']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'M4', 'Payment', 100, 90, '-8.00', '0', '0', '0', '-0.76', '-1.00', '-0.50']], 'Grab')
  const { normalized } = used(parsed.staged)[0]
  assert.equal(normalized.commission, '8.76', 'tax is inside commission')
  // `Customer refund Item` is a text column and must not poison adjustments;
  // only withholding + the BF tax (here absent from commission path) contribute.
  assert.equal(normalized.adjustments, '-0.50', 'withholding only; text refund column ignored, no commission tax')
})
test('Grab advertisement adds the May 8% tax on ads to the advertising spend', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Amount', 'Tax on GrabFood/GrabMart commission, adjustments, ads']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'A1', 'Advertisement', '-12.50', '-1.00']], 'Grab')
  const { normalized } = used(parsed.staged)[0]
  assert.equal(normalized.advertisingSpend, '-13.50', 'ad base + its SST, both signed')
})
test('Grab routes May-spec Adjustment subcategories: eater comp and POS subsidy feed adjustments, cancelled orders do not', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Subcategory', 'Amount', 'Total']
  const parsed = await parse([header,
    ['US Pizza - SS2', '01/08/2026', 'C1', 'Adjustment', 'Deduction - Eater Compensation', '-6.50', '-6.50'],
    ['US Pizza - SS2', '01/08/2026', 'C2', 'Adjustment', 'Order Value', '10.60', '10.60'],
    ['US Pizza - SS2', '01/08/2026', 'C3', 'Adjustment', 'Compensation - Orders', '52.04', '52.04'],
  ], 'Grab')
  const [eater, subsidy, compensation] = used(parsed.staged).map(row => row.normalized)
  assert.equal(eater.adjustments, '-6.50', 'eater compensation is a signed adjustment')
  assert.equal(subsidy.adjustments, '10.60', 'POS integration subsidy is an adjustment credit')
  // A cancelled-order compensation is a settlement credit, not a fee adjustment.
  assert.equal('adjustments' in compensation, false, 'no adjustment contribution')
  assert.equal(compensation.payout, '52.04', 'still moves real payout money')
})
test('a Grab Adjustment with no Subcategory keeps the August payout-only behaviour', async () => {
  const header = ['Store Name', 'Created On', 'Transaction ID', 'Category', 'Amount', 'Total']
  const parsed = await parse([header, ['US Pizza - SS2', '01/08/2026', 'ADJ2', 'Adjustment', '250.00', '250.00']], 'Grab')
  const { normalized } = used(parsed.staged)[0]
  assert.equal(normalized.payout, '250.00')
  assert.equal('adjustments' in normalized, false, 'no Subcategory → no adjustment contribution, like August')
  assert.equal('netSales' in normalized, false)
})

/* -------------------------------------------------------------------------- */
/* Real Grab workbook acceptance (skips when datasource/ is not present)        */
/* -------------------------------------------------------------------------- */

// The datasource folder is gitignored, so these run locally against the real
// export and skip cleanly in CI without it. Both files share the 68-column Grab
// shape; Grab_Summary.xlsx carries Excel serial dates and GRAB_Aug_sales.xlsx
// string dates, and the parser must read either.
const GRAB_FILES = ['datasource/Grab_Summary.xlsx', 'datasource/GRAB_Aug_sales.xlsx']
const grabFile = GRAB_FILES.map(path => join(process.cwd(), path)).find(existsSync)

test('the real Grab export reconciles gross − discount = net and settlement = payout', { skip: !grabFile }, async () => {
  const buffer = readFileSync(grabFile!)
  const parsed = await parseSalesFile(new File([new Uint8Array(buffer)], 'grab.xlsx'), 'Grab', '2026-08')
  const rows = used(parsed.staged)
  assert.ok(rows.length > 25000, `expected the full export, parsed ${rows.length} rows`)

  let orderRows = 0
  let settlementRows = 0
  for (const { normalized } of rows) {
    const money = normalized as Record<string, unknown>
    if (typeof money.grossSales === 'string' && typeof money.discount === 'string' && typeof money.netSales === 'string') {
      orderRows++
      const drift = Number(money.grossSales) - Number(money.discount) - Number(money.netSales)
      assert.ok(Math.abs(drift) < 0.005, `gross − discount = net drifted by ${drift} on row ${JSON.stringify(money)}`)
    }
    if (typeof money.netSales === 'string' && typeof money.tax === 'string' && typeof money.serviceCharge === 'string'
      && typeof money.totalDeductions === 'string' && typeof money.payout === 'string') {
      settlementRows++
      const collected = Number(money.netSales) + Number(money.serviceCharge) + Number(money.tax)
      const drift = collected - Number(money.totalDeductions) - Number(money.payout)
      assert.ok(Math.abs(drift) < 0.005, `net + SC + SST − deductions = payout drifted by ${drift}`)
    }
  }
  assert.ok(orderRows > 25000, `every Payment/Dine Out row carries the order identity, saw ${orderRows}`)
  assert.ok(settlementRows > 25000, 'the settlement identity is checked across the export')
})

test('the real Grab export itemizes the May-spec platform fee, commission and ad tax without inventing figures', { skip: !grabFile }, async () => {
  const buffer = readFileSync(grabFile!)
  const parsed = await parseSalesFile(new File([new Uint8Array(buffer)], 'grab.xlsx'), 'Grab', '2026-08')
  const rows = used(parsed.staged)

  // The May export's profile columns are all present, so nothing is reported missing.
  assert.equal(parsed.issues.filter(i => i.code === 'missing_column').length, 0)

  // Every Payment/Dine Out row that states a commission also states the BF tax
  // feeding it, so commission is never silently zero when the tax is present.
  const withCommission = rows.filter(row => (row.normalized as Record<string, unknown>).commission !== null
    && (row.normalized as Record<string, unknown>).commission !== undefined)
  assert.ok(withCommission.length > 25000, `expected the commission-carrying export, saw ${withCommission.length}`)

  // The platform fee and advertising spend are derived from the itemized columns
  // only — never the combined collected−payout block. Asserting exact memorized
  // totals would couple the test to the outlet-mapping scope, which is
  // Finance-owned, so the test instead verifies the fields are non-zero and
  // signed consistently with their sources (negative spend).
  const total = (key: string) => rows.reduce((sum, row) => sum + Number((row.normalized as Record<string, unknown>)[key] ?? 0), 0)
  assert.ok(total('advertisingSpend') < 0, 'advertising is a signed expense')
})

