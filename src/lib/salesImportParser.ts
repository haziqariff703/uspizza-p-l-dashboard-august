import { isSisterBrand } from '../data/outletMaster'
import {
  addAmounts, amount, amountsToJson, AMOUNT_ABSENT, AMOUNT_UNKNOWN, parseDecimal, scaleAmount,
  subtractAmounts, taxFromInclusive, type Amount, type Decimal,
} from './decimal'

export type SalesSource = 'POS' | 'Grab' | 'FoodPanda' | 'Shopee' | 'Apps'

/** Bump when a profile's column mapping or arithmetic changes. Stored per import. */
export const PARSER_VERSION = '2026-09-24'
/** Bump when the outlet/alias rules change. Stored per import. */
export const MAPPING_VERSION = '2026-09-2'

/**
 * The money keys one staged row can carry, each its own normalized field. The
 * daily read model sums these exactly; `platformFees` is the narrow itemized
 * platform/service fee and `totalDeductions` is the combined `collected − payout`
 * kept solely for the settlement identity check — never fed to a fee total.
 */
export const MONEY_KEYS = ['grossSales', 'discount', 'netSales', 'tax', 'serviceCharge', 'platformFees', 'advertisingSpend', 'payout', 'commission', 'paymentGatewayFee', 'adjustments', 'totalDeductions'] as const

export interface FeeLine {
  feeType: 'commission' | 'payment_processing' | 'delivery' | 'service' | 'marketing'
    | 'voucher_subsidy' | 'refund_adjustment' | 'tax' | 'other' | 'unclassified'
  amount: Decimal | null
  taxAmount: Decimal | null
  sourceLabel: string
}

/** `normalized_row_json` exactly as the publication contract expects it. */
export interface NormalizedRow extends Record<string, unknown> {
  salesDate: string
  /** Lowercase; must equal the import's own source or publication rejects the row. */
  source: string
  feeLines: FeeLine[]
}

/** One source row, kept whether or not the parser could use it. */
export interface StagedRow {
  /** 1-based row number in the sheet, so it can be found in the original file. */
  sourceRowNumber: number
  raw: Record<string, unknown>
  /** Contract money for this row. Null when the row contributes nothing. */
  normalized: NormalizedRow | null
  /** Stable business key, scoped to outlet + platform. Null when the export has none. */
  sourceRecordKey: string | null
  /** Why it contributed nothing. Null when it did. */
  skipReason: string | null
  /** Outlet name as the source wrote it, for mapping to a canonical outlet. */
  outletName: string | null
}

/** A problem worth a reviewer's attention, recorded as an import_validation_issue. */
export interface ParseIssue {
  severity: 'info' | 'warning' | 'error'
  code: string
  message: string
}

/**
 * Browser-side preview only. The database aggregates the real daily totals from
 * approved staged rows; this exists so a preparer can sanity-check a file before
 * submitting it. It uses ordinary floating point and must never be written anywhere.
 */
export interface PreviewDaily {
  salesDate: string
  outletName: string
  source: SalesSource
  netSales: number | null
  recordCount: number
}

export interface ParsedImport {
  sheetName: string
  /** 1-based. Null for POS, whose layout has no header row. */
  headerRowNumber: number | null
  parserVersion: string
  mappingVersion: string
  staged: StagedRow[]
  previewDaily: PreviewDaily[]
  issues: ParseIssue[]
}

/**
 * One declarative profile per source, as the guide requires: which columns
 * identify the export, where the date, outlet and transaction identity come
 * from, and which columns the mapping depends on.
 *
 * `identityColumns` build the stable source business key. Verified unique per
 * outlet against the real August exports; a filename, hash or sheet row number
 * would not be stable across re-exports and the contract forbids them.
 *
 * POS has no profile here: it is a grouped report read by position, and it
 * carries no transaction identity at all — see POS_NO_IDENTITY below.
 */
export interface SourceProfile {
  headerColumns: string[]
  dateColumn: string
  outletColumn: string
  identityColumns: string[]
  readsColumns: string[]
}

export const SOURCE_PROFILES: Record<Exclude<SalesSource, 'POS'>, SourceProfile> = {
  Grab: {
    headerColumns: ['Created On', 'Store Name'],
    dateColumn: 'Created On',
    outletColumn: 'Store Name',
    // Category distinguishes a payment from an advertisement charge, and
    // Subcategory separates an eater-compensation deduction from a cancelled
    // order credit on an Adjustment row. The May and August exports share one
    // 68-column shape; a column absent from a given file is `unknown`/`absent`
    // via cell()/optionalCharge(), never RM 0.
    identityColumns: ['Transaction ID', 'Category'],
    readsColumns: [
      'Category', 'Subcategory', 'Net Sales', 'Total', 'Offer', 'Discount (Merchant-Funded)',
      'Delivery Fee Discount (Merchant-Funded)', 'Tax on Order Value', 'Restaurant Packaging Charge',
      'Amount', 'Order commission', 'Step-up commission', 'GrabKitchen Commission', 'GrabKitchen Other Commission',
      'Grab Fee', 'Marketing success fee', 'Net MDR', 'Customer refund Item', 'Withholding Tax',
      'Tax on GrabFood/GrabMart commission, adjustments, ads', 'Transfer Date',
    ],
  },
  FoodPanda: {
    headerColumns: ['Order Date', 'Outlet Name'],
    dateColumn: 'Order Date',
    outletColumn: 'Outlet Name',
    identityColumns: ['Order Code'],
    readsColumns: ['Products Value Paid By Customer', 'Restaurant Revenue', 'SST On Restaurant Revenue', 'foodpanda Commission', 'SST on foodpanda commission', 'Payable Amount', 'Waiting Time Fee', 'Packaging Fees Paid By Customer'],
  },
  Shopee: {
    headerColumns: ['Complete Time', 'Store Name'],
    dateColumn: 'Complete Time',
    outletColumn: 'Store Name',
    identityColumns: ['Order ID'],
    readsColumns: ['Order Status', 'Food original price', 'Transaction Amount', 'Earnings', 'Surcharge fee', 'Comission'],
  },
  Apps: {
    headerColumns: ['Order Date', 'Outlet Name'],
    dateColumn: 'Order Date',
    outletColumn: 'Outlet Name',
    identityColumns: ['Order ID'],
    readsColumns: ['Status', 'Payment Status', 'Subtotal (RM)', 'Tax (RM)', 'Delivery Fee (RM)', 'Grand Total (RM)'],
  },
}

export const POS_NO_IDENTITY: ParseIssue = {
  severity: 'error',
  code: 'no_source_record_key',
  message: 'The POS report is a grouped summary with no receipt or transaction identifier, so its '
    + 'rows cannot carry the stable source key publication requires. Finance needs a POS export that '
    + 'identifies each sale before this source can be approved. Rows are still staged and readable — '
    + 'no figure has been invented.',
}

/**
 * FoodPanda publishes three distinct layouts under the one source, so the
 * `FoodPanda` branch detects which one a workbook is before mapping it:
 *
 *  - `outletDaily`  the per-outlet-daily portal export (`Order Date` + `Order Code`
 *    + `Products Value Paid By Customer`). KEPT UNCHANGED — this is the legacy path.
 *  - `compiled`     `FOODPANDA_COMPILED.xlsx`: order-level `Appendix A` and the
 *    additional-charges `Appendix B` in one workbook, two different shapes.
 *  - `invoice`      `Foodpanda_Invoice_Report.xlsx` `Invoice Master` sheet: one
 *    row per self-billed invoice, an aggregate with no per-transaction identity.
 *
 * Detection is by header, never by filename: a renamed file still parses and an
 * unrecognised one still stops at the legacy path's findHeader throw.
 */
export type FoodPandaLayout = 'outletDaily' | 'compiled' | 'invoice'

/**
 * Appendix A: order-level statement. `Order Code` is the stable order identity
 * (3,309 distinct across the real August file — never the sheet row number).
 */
export const FOODPANDA_APPENDIX_A = {
  headerColumns: ['Order Code', 'foodpanda Commission Base', 'Outlet Name'],
  dateColumns: ['Order Date', 'Invoice Date'],
  outletColumn: 'Outlet Name',
  identityColumns: ['Order Code'],
  readsColumns: [
    'Products Value Paid By Customer', 'Voucher Paid By Vendor', 'Discount Paid By Vendor',
    'Pandabox Voucher Paid By Vendor', 'Delivery Fee Discount Paid By Vendor', 'Restaurant Revenue',
    'foodpanda Commission Base', 'foodpanda Commission', 'SST on foodpanda commission',
    'Payable Amount', 'SST On Restaurant Revenue', 'Pandabox Fee Paid By Vendor',
    'Waiting Time Fee', 'Customer Targeting Fee', 'Packaging Fees Paid By Customer',
  ],
} as const

/**
 * Appendix B: additional charges. It carries `Invoice Number` and `Vendor Code`
 * but no `Outlet Name`, so an outlet is attributed through the Appendix A
 * invoice → outlet map when one exists; otherwise the row is staged without an
 * outlet rather than guessed at.
 */
export const FOODPANDA_APPENDIX_B = {
  headerColumns: ['Category', 'Net Total', 'Subject to VAT rate', 'Invoice Number'],
  dateColumns: ['Invoice Date'],
  invoiceColumn: 'Invoice Number',
  categoryColumn: 'Category',
  netTotalColumn: 'Net Total',
  readsColumns: ['Category', 'Net Total', 'Subject to VAT rate', 'Invoice Number', 'Invoice Date'],
} as const

/**
 * Invoice Master: the self-billed e-invoice audit. The real header is on the
 * SECOND row of the sheet (a merged group-title row sits above it), which
 * findHeader already handles. `Business Date` is the reporting date and every
 * column the spec names is read by its exact printed header.
 */
export const FOODPANDA_INVOICE_MASTER = {
  headerColumns: ['Invoice No.', 'Outlet Name', 'Sales Value Excl. SST (RM)'],
  dateColumns: ['Business Date', 'Period From', 'Invoice Issue Date'],
  outletColumn: 'Outlet Name',
  readsColumns: [
    'Total Revenue (RM)', 'Sales Value Excl. SST (RM)', 'Sales SST 6% (RM)', 'Sales Incl. SST (RM)',
    'Commission Base (RM)', 'Commission SST (RM)', 'Wastage Commission Base (RM)', 'Wastage Commission SST (RM)',
    'Fees & Adj (SST) Base (RM)', 'Fees & Adj (SST) SST (RM)', 'Fees & Adj (Non-SST) Base (RM)',
    'Pandabox Fee Base (RM)', 'Pandabox Fee SST (RM)', 'Targeted Cust. Fee Base (RM)', 'Targeted Cust. Fee SST (RM)',
    'Waiting Time Fee Base (RM)', 'Waiting Time Fee SST (RM)', "Today's Earnings [a-c] (RM)", 'Total Payable [f]+[a-c] (RM)',
  ],
} as const

/**
 * Invoice Master aggregates many orders into one invoice and prints no order or
 * receipt identifier, so its rows cannot carry the per-transaction source key
 * publication requires. Mirrors POS_NO_IDENTITY: rows are still staged and
 * readable, but a reviewer cannot approve them until Finance supplies an
 * order-level source.
 */
export const FOODPANDA_INVOICE_NO_IDENTITY: ParseIssue = {
  severity: 'error',
  code: 'no_source_record_key',
  message: 'The Foodpanda Invoice Master is a per-invoice aggregate and prints no order or receipt '
    + 'identifier, so its rows cannot carry the stable source key publication requires. Use the '
    + 'order-level Appendix A export (FOODPANDA_COMPILED.xlsx) or Finance must supply an invoice '
    + 'report with per-order identity. Rows are still staged and readable — no figure has been invented.',
}

/** Appendix B additional-charge categories that are advertising (8% SST). */
const FOODPANDA_AD_CATEGORIES = ['Keywords', 'Premium Placement (CPC)', 'Display Ads'] as const
/** Appendix B cancellation category (a signed adjustment, credits included). */
const FOODPANDA_CANCELLATION_CATEGORIES = ['Cancellation orders & adjusment invoice', 'Cancellation orders'] as const

const HEADER_SEARCH_DEPTH = 50

/**
 * The app's `Tax (RM)` column is not SST alone: it bundles 6% SST with the 10%
 * dine-in service charge. August confirms the rates — every dine-in order
 * charges 16% of the order value and no pickup or delivery order does — so the
 * column is split by the share each rate contributes. `Order Type` is not used
 * as the discriminator because the rate itself is the stronger evidence: some
 * dine-in orders carry only one of the two charges, or neither.
 */
const APPS_SERVICE_CHARGE_RATE = 0.1
const APPS_SST_RATE = 0.06
/** Which of the two charges applied. Ordered most inclusive first. */
const APPS_CHARGE_COMBINATIONS = [
  { serviceCharge: true, tax: true },
  { serviceCharge: true, tax: false },
  { serviceCharge: false, tax: true },
  { serviceCharge: false, tax: false },
]
/** A sen of rounding per component, so a two-component charge can differ by two. */
const APPS_RATE_TOLERANCE = 0.03

/**
 * Splits the app's combined charges into service charge and SST. The two have
 * different bases: the 10% service charge is on the order value alone, while
 * the 6% SST also covers the delivery fee. A row whose charges match no
 * combination of the contractual rates keeps both unknown rather than being
 * forced into a split the source does not support.
 */
function splitAppsCharges(charges: Amount, orderValue: Amount, deliveryFee: Amount): { serviceCharge: Amount; tax: Amount } {
  const unknown = { serviceCharge: AMOUNT_UNKNOWN, tax: AMOUNT_UNKNOWN }
  if (charges.kind !== 'value' || orderValue.kind !== 'value' || deliveryFee.kind !== 'value') return unknown
  // Classification only — it picks which charges applied, never a stored figure.
  const value = Number(orderValue.value)
  if (value < 0) return unknown
  const total = Number(charges.value)
  const delivery = Number(deliveryFee.value)
  const applied = APPS_CHARGE_COMBINATIONS.find(combination => Math.abs(total
    - (combination.serviceCharge ? value * APPS_SERVICE_CHARGE_RATE : 0)
    - (combination.tax ? (value + delivery) * APPS_SST_RATE : 0)) <= APPS_RATE_TOLERANCE)
  if (!applied) return unknown
  const serviceCharge = applied.serviceCharge ? scaleAmount(orderValue, 1n, 10n) : amount('0')
  // SST is the remainder, so the two parts always add back to the stated column.
  return { serviceCharge, tax: subtractAmounts(charges, serviceCharge) }
}

const isoLocalDate = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`

function isoDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return isoLocalDate(value)
  if (typeof value !== 'string') return null
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (match) return `${match[3]}-${match[2]}-${match[1]}`
  const namedMonthMatch = value.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/)
  if (namedMonthMatch) {
    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
      .indexOf(namedMonthMatch[2].toLowerCase()) + 1
    if (month > 0) return `${namedMonthMatch[3]}-${String(month).padStart(2, '0')}-${namedMonthMatch[1].padStart(2, '0')}`
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : isoLocalDate(parsed)
}

const rawByHeader = (row: unknown[], header: string[]) =>
  Object.fromEntries(header.map((name, index) => [name || `column_${index + 1}`, row[index] ?? null]))
const rawByPosition = (row: unknown[]) =>
  Object.fromEntries(row.map((value, index) => [`column_${index + 1}`, value ?? null]))

const normalizedRow = (salesDate: string, source: SalesSource, money: Record<string, Amount>, feeLines: FeeLine[] = []): NormalizedRow =>
  ({ salesDate, source: source.toLowerCase(), ...amountsToJson(money), feeLines })

/**
 * Finds the sheet and row where the table actually starts. Throws rather than
 * guessing: the guide's rule is that an unrecognised layout stops at
 * needs_mapping instead of being published.
 */
function findHeader(
  sheets: Array<{ name: string; rows: unknown[][] }>,
  columns: string[],
): { name: string; rows: unknown[][]; headerIndex: number } {
  for (const sheet of sheets) {
    const headerIndex = sheet.rows.slice(0, HEADER_SEARCH_DEPTH)
      .findIndex(row => columns.every(column => row.map(String).includes(column)))
    if (headerIndex >= 0) return { ...sheet, headerIndex }
  }
  throw new Error(
    `No header row found in the first ${HEADER_SEARCH_DEPTH} rows of any sheet. `
    + `This profile needs the columns: ${columns.join(', ')}. `
    + 'Check the source before importing — nothing was parsed.',
  )
}

/** findHeader for a specific sheet, returning null instead of throwing. */
function findHeaderIn(
  sheet: { name: string; rows: unknown[][] },
  columns: readonly string[],
): number {
  return sheet.rows.slice(0, HEADER_SEARCH_DEPTH)
    .findIndex(row => columns.every(column => row.map(String).includes(column)))
}

/**
 * Classifies a FoodPanda workbook by the sheets and headers it actually
 * carries. Only the compiled and invoice layouts are detected here; anything
 * else falls through to the outlet-daily path, whose own findHeader then
 * decides whether the layout is recognised at all.
 */
export function detectFoodPandaLayout(
  sheets: Array<{ name: string; rows: unknown[][] }>,
): FoodPandaLayout {
  if (sheets.some(sheet => findHeaderIn(sheet, FOODPANDA_INVOICE_MASTER.headerColumns) >= 0)) return 'invoice'
  if (sheets.some(sheet => findHeaderIn(sheet, FOODPANDA_APPENDIX_A.headerColumns) >= 0)) return 'compiled'
  return 'outletDaily'
}

/** Header-scoped cell readers, shared by the compiled and invoice branches. */
function headerReader(header: string[]) {
  const has = (name: string) => header.includes(name)
  const at = (row: unknown[], name: string) => { const index = header.indexOf(name); return index < 0 ? undefined : row[index] }
  /** A column absent from the file is unknown; a blank cell is no contribution. */
  const cell = (row: unknown[], name: string): Amount => {
    if (!has(name)) return AMOUNT_UNKNOWN
    const value = parseDecimal(at(row, name))
    return value === undefined ? AMOUNT_ABSENT : amount(value)
  }
  // A present, blank optional charge/discount column states no charge.
  const optionalCharge = (row: unknown[], name: string): Amount => {
    const value = cell(row, name)
    const raw = at(row, name)
    return value.kind === 'absent'
      ? (raw === null || raw === undefined || raw === '' ? amount('0') : AMOUNT_UNKNOWN)
      : value
  }
  // An additive component whose column may simply not exist in an older export:
  // a missing column contributes nothing (absent), never a poisoned sum.
  const optionalComponent = (row: unknown[], name: string): Amount =>
    (has(name) ? cell(row, name) : AMOUNT_ABSENT)
  const feeLine = (row: unknown[], feeType: FeeLine['feeType'], amountColumn: string, taxColumn?: string): FeeLine[] => {
    const value = has(amountColumn) ? parseDecimal(at(row, amountColumn)) : undefined
    const taxValue = taxColumn && has(taxColumn) ? parseDecimal(at(row, taxColumn)) : undefined
    if (value === undefined && taxValue === undefined) return []
    return [{ feeType, amount: value ?? null, taxAmount: taxValue ?? null, sourceLabel: amountColumn }]
  }
  return { has, at, cell, optionalCharge, optionalComponent, feeLine }
}

/** A date from the first column that yields one, then null. */
function firstDate(row: unknown[], columns: readonly string[], at: (row: unknown[], name: string) => unknown): string | null {
  for (const column of columns) {
    const date = isoDate(at(row, column))
    if (date) return date
  }
  return null
}

const buildResult = (
  sheetName: string,
  headerRowNumber: number | null,
  staged: StagedRow[],
  issues: ParseIssue[],
): ParsedImport => ({
  sheetName,
  headerRowNumber,
  parserVersion: PARSER_VERSION,
  mappingVersion: MAPPING_VERSION,
  staged,
  previewDaily: preview(staged, 'FoodPanda'),
  issues,
})

/** The three money states for a set of columns that must all be present. */
function requireColumns(
  header: string[],
  columns: readonly string[],
  issues: ParseIssue[],
): void {
  for (const column of columns.filter(name => !header.includes(name))) {
    issues.push({
      severity: 'warning',
      code: 'missing_column',
      message: `This file has no "${column}" column. Whatever it feeds is recorded as unknown, never as RM 0.`,
    })
  }
}

/**
 * @param reportingMonth `YYYY-MM`. Publication aborts on any approved row dated
 * outside its import's month, so a row from a neighbouring month is excluded
 * here with a reason instead of making the whole file unpublishable.
 */
export async function parseSalesFile(file: File, source: SalesSource, reportingMonth: string): Promise<ParsedImport> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true })
  const sheets = workbook.SheetNames.map(name => ({
    name,
    rows: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1, defval: null, raw: true }),
  }))
  const staged: StagedRow[] = []
  const issues: ParseIssue[] = []
  let outOfPeriodRows = 0
  const outOfPeriod = (date: string) => {
    if (date.startsWith(`${reportingMonth}-`)) return null
    outOfPeriodRows++
    return `Dated ${date}, outside the ${reportingMonth} reporting period`
  }
  const reportOutOfPeriod = () => {
    if (!outOfPeriodRows) return
    issues.push({
      severity: 'warning',
      code: 'out_of_period_row',
      message: `${outOfPeriodRows.toLocaleString()} rows are dated outside ${reportingMonth} and are `
        + 'excluded from this import. They are staged and readable. If they belong in this month, '
        + 'Finance needs to confirm whether the month is cut by order date or by invoice date.',
    })
  }

  if (source === 'POS') {
    // The POS export is a grouped report, not a table: date and outlet arrive as
    // heading rows and apply to the detail rows beneath them.
    const sheet = sheets[0]
    issues.push(POS_NO_IDENTITY)
    let date: string | null = null
    let outlet: string | null = null
    sheet.rows.forEach((row, index) => {
      if (index < 6) return
      const stage = (normalized: NormalizedRow | null, skipReason: string | null) =>
        staged.push({ sourceRowNumber: index + 1, raw: rawByPosition(row), normalized, sourceRecordKey: null, skipReason, outletName: outlet })
      const group = row[0]
      if (isoDate(group)) { date = isoDate(group); return stage(null, 'Date heading') }
      if (typeof group === 'string' && /^\w+-/.test(group)) {
        outlet = group.replace(/^\w+-/, '').trim()
        return stage(null, 'Outlet heading')
      }
      if (!date || !outlet) return stage(null, 'No date or outlet heading in scope')
      if (typeof row[1] !== 'string') return stage(null, 'Not a sales line')
      const posOutside = outOfPeriod(date)
      if (posOutside) return stage(null, posOutside)
      const cell = (position: number): Amount => {
        const value = parseDecimal(row[position])
        return value === undefined ? AMOUNT_ABSENT : amount(value)
      }
      stage(normalizedRow(date, source, {
        grossSales: cell(2), discount: cell(3), netSales: cell(4), tax: cell(5), serviceCharge: cell(6),
      }), null)
    })
    reportOutOfPeriod()
    return {
      sheetName: sheet.name, headerRowNumber: null,
      parserVersion: PARSER_VERSION, mappingVersion: MAPPING_VERSION,
      staged, previewDaily: preview(staged, source), issues,
    }
  }

  if (source === 'FoodPanda') {
    const layout = detectFoodPandaLayout(sheets)
    if (layout === 'compiled') {
      return parseFoodpandaCompiled(sheets, outOfPeriod, reportOutOfPeriod)
    }
    if (layout === 'invoice') {
      return parseFoodpandaInvoice(sheets, outOfPeriod, reportOutOfPeriod)
    }
    // 'outletDaily' falls through to the unchanged legacy FoodPanda profile.
  }

  const profile = SOURCE_PROFILES[source]
  const { name: sheetName, rows, headerIndex } = findHeader(sheets, profile.headerColumns)
  const header = rows[headerIndex].map(String)
  for (const column of profile.readsColumns.filter(name => !header.includes(name))) {
    issues.push({
      severity: 'warning',
      code: 'missing_column',
      message: `This file has no "${column}" column. Whatever it feeds is recorded as unknown, never as RM 0.`,
    })
  }
  const missingIdentity = profile.identityColumns.filter(column => !header.includes(column))
  if (missingIdentity.length) {
    issues.push({
      severity: 'error',
      code: 'no_source_record_key',
      message: `This file has no ${missingIdentity.join(' / ')} column, so its rows cannot carry the `
        + 'stable source key publication requires. Rows are staged but cannot be approved.',
    })
  }

  const has = (name: string) => header.includes(name)
  const at = (row: unknown[], name: string) => { const index = header.indexOf(name); return index < 0 ? undefined : row[index] }

  /** A column absent from the file is unknown; a blank cell is no contribution. */
  const cell = (row: unknown[], name: string): Amount => {
    if (!has(name)) return AMOUNT_UNKNOWN
    const value = parseDecimal(at(row, name))
    return value === undefined ? AMOUNT_ABSENT : amount(value)
  }
  // A present, blank optional charge/discount column states no charge. A
  // missing column stays unknown. Verified against the August order equations.
  const optionalCharge = (row: unknown[], name: string): Amount => {
    const value = cell(row, name)
    const raw = at(row, name)
    return value.kind === 'absent'
      ? (raw === null || raw === undefined || raw === '' ? amount('0') : AMOUNT_UNKNOWN)
      : value
  }
  // An additive component whose column may simply not exist in an older export.
  // Unlike cell(), a missing column contributes nothing (absent) rather than
  // poisoning the whole sum with unknown. Used for the May-only Grab columns so
  // both the May and August files share one arithmetic path.
  const optionalComponent = (row: unknown[], name: string): Amount =>
    (has(name) ? cell(row, name) : AMOUNT_ABSENT)
  const feeLine = (row: unknown[], feeType: FeeLine['feeType'], amountColumn: string, taxColumn?: string): FeeLine[] => {
    const value = has(amountColumn) ? parseDecimal(at(row, amountColumn)) : undefined
    const taxValue = taxColumn && has(taxColumn) ? parseDecimal(at(row, taxColumn)) : undefined
    if (value === undefined && taxValue === undefined) return []
    return [{ feeType, amount: value ?? null, taxAmount: taxValue ?? null, sourceLabel: amountColumn }]
  }
  const recordKey = (row: unknown[]) => {
    const parts = profile.identityColumns.map(column => {
      const value = at(row, column)
      return value === null || value === undefined ? '' : String(value).trim()
    })
    return parts.every(Boolean) ? parts.join('|') : null
  }

  let missingKeyRows = 0

  rows.forEach((row, index) => {
    if (index <= headerIndex) return
    const outletCell = at(row, profile.outletColumn)
    const outletName = typeof outletCell === 'string' ? outletCell : null
    const stage = (normalized: NormalizedRow | null, skipReason: string | null) => {
      const key = normalized ? recordKey(row) : null
      if (normalized && !key) missingKeyRows++
      staged.push({ sourceRowNumber: index + 1, raw: rawByHeader(row, header), normalized, sourceRecordKey: key, skipReason, outletName })
    }

    if (row.every(value => value === null || value === '')) return stage(null, 'Blank row')
    const date = isoDate(at(row, profile.dateColumn))
    if (!date) return stage(null, `No usable date in "${profile.dateColumn}"`)
    if (!outletName) return stage(null, `No outlet name in "${profile.outletColumn}"`)
    if (isSisterBrand(outletName)) return stage(null, 'Sister brand, not a US Pizza outlet')
    // Grab's August export carries a tail of orders created on the last day of
    // the previous month (31 July) that settle into August; Grab_Summary.xlsx
    // counts them in August. For a Grab row whose Created On falls outside the
    // reporting month, fall back to the settlement date (Transfer Date) so the
    // tail lands in the month it settled — and is stored under a date the
    // publisher accepts. Every other source, and any Grab row already dated in
    // the reporting month, keeps its own date.
    let reportingDate = date
    if (source === 'Grab' && !date.startsWith(`${reportingMonth}-`)) {
      const settled = isoDate(at(row, 'Transfer Date'))
      if (settled) reportingDate = settled
    }
    const outside = outOfPeriod(reportingDate)
    if (outside) return stage(null, outside)

    if (source === 'Grab') {
      const category = at(row, 'Category')
      // Dine Out Discount rows carry the identical order-economics columns to
      // Payment rows — verified against August, where they are 3 of 30,309 rows.
      // Their Amount is not gross sales: the summary's GROSS SALES is the Sum of
      // Amount over the Payment category only, so a Dine Out Discount order
      // keeps its net/discount/payout but leaves gross absent.
      if (category === 'Payment' || category === 'Dine Out Discount') {
        const collected = cell(row, 'Net Sales')
        const tax = cell(row, 'Tax on Order Value')
        // Real column is "Restaurant Packaging Charge" — verified 0.00 on every
        // August row, but read by name rather than assumed, in case that changes.
        // It is a platform fee, not a customer service charge, so it feeds
        // `platformFees` and stays out of the dine-in service-charge split.
        const packagingCharge = optionalCharge(row, 'Restaurant Packaging Charge')
        const payout = cell(row, 'Total')
        // Commission is the signed source's own itemized columns stored as an
        // unsigned magnitude so the rate is positive (mirrors `discount`). The
        // May spec defines Total Commission as order + step-up + the 8% tax on
        // commission held in the "Tax on GrabFood/GrabMart commission,
        // adjustments, ads" column; that column is absent from the synthetic
        // August profile rows, where it contributes nothing.
        const commissionTax = optionalComponent(row, 'Tax on GrabFood/GrabMart commission, adjustments, ads')
        const commission = scaleAmount(addAmounts(
          cell(row, 'Order commission'),
          cell(row, 'Step-up commission'),
          cell(row, 'GrabKitchen Commission'),
          cell(row, 'GrabKitchen Other Commission'),
          commissionTax,
        ), -1n, 1n)
        return stage(normalizedRow(reportingDate, source, {
          ...(category === 'Payment' ? { grossSales: cell(row, 'Amount') } : {}),
          netSales: subtractAmounts(collected, tax, packagingCharge),
          payout,
          discount: subtractAmounts(amount('0'), addAmounts(
            optionalCharge(row, 'Offer'),
            optionalCharge(row, 'Discount (Merchant-Funded)'),
            optionalCharge(row, 'Delivery Fee Discount (Merchant-Funded)'),
          )),
          tax,
          // No dine-in service charge: the packaging charge is a platform fee.
          serviceCharge: amount('0'),
          // Narrow itemized platform fee: Grab Fee + Restaurant Packaging Charge
          // + the May-only Marketing success fee, stored as an unsigned
          // magnitude like the other Grab cost columns. A missing marketing
          // column contributes nothing, so the August profile is unchanged.
          platformFees: addAmounts(
            optionalCharge(row, 'Grab Fee'),
            packagingCharge,
            scaleAmount(optionalComponent(row, 'Marketing success fee'), -1n, 1n),
          ),
          paymentGatewayFee: cell(row, 'Net MDR'),
          // The BF tax on commission is part of `commission` per the May spec,
          // so it must not also land in adjustments. Adjustments keep only the
          // signed withholding-tax column. `Customer refund Item` is deliberately
          // excluded: in the real export it is a text column of product names,
          // so reading it as money would poison every Payment row's adjustments
          // to `unknown` (null).
          adjustments: addAmounts(cell(row, 'Withholding Tax')),
          commission,
          // The combined collected − payout, retained solely for the settlement
          // identity check. Never fed to the Section 2 fee total.
          totalDeductions: subtractAmounts(collected, payout),
        }, [
          ...feeLine(row, 'commission', 'Order commission'),
          ...feeLine(row, 'commission', 'Step-up commission'),
          ...feeLine(row, 'commission', 'GrabKitchen Commission'),
          ...feeLine(row, 'commission', 'GrabKitchen Other Commission'),
          ...feeLine(row, 'tax', 'Tax on GrabFood/GrabMart commission, adjustments, ads'),
        ]), null)
      }
      if (category === 'Advertisement') {
        // Advertisement expense = ad base Amount + its 8% SST, both signed.
        return stage(normalizedRow(reportingDate, source, {
          advertisingSpend: addAmounts(
            cell(row, 'Amount'),
            optionalComponent(row, 'Tax on GrabFood/GrabMart commission, adjustments, ads'),
          ),
        }, [
          ...feeLine(row, 'marketing', 'Amount'),
          ...feeLine(row, 'tax', 'Tax on GrabFood/GrabMart commission, adjustments, ads'),
        ]), null)
      }
      // Adjustment rows (credits/debits with no order economics) still move
      // real money — Total is a real payout contribution, verified RM12,046.99
      // across August — so they are staged as a payout-only line, not dropped.
      // The May export sub-classifies them: `Deduction - Eater Compensation`
      // and the `Order Value` POS subsidy feed the signed adjustments total,
      // while `Compensation - Orders` (customer-cancelled orders) is a separate
      // settlement credit that contributes to payout only. An August file has no
      // usable Subcategory, so it degrades to the plain payout-only line.
      if (category === 'Adjustment') {
        const subcategory = at(row, 'Subcategory')
        const total = cell(row, 'Total')
        const contributesToAdjustments = subcategory === 'Deduction - Eater Compensation'
          || subcategory === 'Order Value'
        return stage(normalizedRow(reportingDate, source, {
          payout: total,
          ...(contributesToAdjustments
            ? { adjustments: total }
            : { adjustments: AMOUNT_ABSENT }),
        }, feeLine(row, 'refund_adjustment', 'Amount')), null)
      }
      return stage(null, `Category "${String(category)}" is not a payment, advertisement or adjustment line`)
    }

    if (source === 'Shopee') {
      const status = at(row, 'Order Status')
      if (status !== 'Completed') return stage(null, `Order status "${String(status)}" is not Completed`)
      // Shopee states no tax column, so SST is calculated at 6% inside the
      // tax-inclusive Transaction Amount, per the owner's confirmed rule.
      // Discount is gross − net rather than the itemised promotion columns:
      // those reconcile to the tax-inclusive Transaction Amount, so using them
      // would leave gross − discount ≠ net in the settlement derivation.
      const collected = cell(row, 'Transaction Amount')
      const tax = taxFromInclusive(collected)
      const netSales = subtractAmounts(collected, tax)
      const grossSales = cell(row, 'Food original price')
      const payout = cell(row, 'Earnings')
      return stage(normalizedRow(date, source, {
        grossSales, netSales, tax, payout,
        discount: subtractAmounts(grossSales, netSales),
        // Shopee's export carries no service-charge column and its surcharge
        // field is nil across August, so no charge applies.
        serviceCharge: amount('0'),
        // Narrow itemized platform fee: Surcharge fee only.
        platformFees: optionalCharge(row, 'Surcharge fee'),
        // Shopee's export carries its own 'Comission' column (used per
        // explicit instruction, overriding the earlier no-source rule).
        commission: optionalCharge(row, 'Comission'),
        paymentGatewayFee: AMOUNT_UNKNOWN,
        adjustments: AMOUNT_UNKNOWN,
        // Combined collected − payout, retained for the settlement identity.
        totalDeductions: subtractAmounts(collected, payout),
      }), null)
    }

    if (source === 'Apps') {
      const status = at(row, 'Status')
      const payment = at(row, 'Payment Status')
      if (status !== 'Completed') return stage(null, `Status "${String(status)}" is not Completed`)
      if (payment !== 'Paid') return stage(null, `Payment status "${String(payment)}" is not Paid`)
      const grossSales = cell(row, 'Subtotal (RM)')
      const deliveryFee = cell(row, 'Delivery Fee (RM)')
      const collected = cell(row, 'Grand Total (RM)')
      // Grand Total carries the order value, the delivery fee and the combined
      // charges column, so net sales is the order value underneath all three —
      // the same subtraction whichever charges applied.
      const charges = cell(row, 'Tax (RM)')
      const netSales = subtractAmounts(collected, charges, deliveryFee)
      const { serviceCharge, tax } = splitAppsCharges(charges, netSales, deliveryFee)
      return stage(normalizedRow(date, source, {
        grossSales, netSales, tax, serviceCharge,
        // No settlement or bank-payout report exists for the app, and an order
        // grand total is not money received. Fees cannot be derived without it.
        payout: AMOUNT_UNKNOWN,
        discount: subtractAmounts(grossSales, netSales),
        // The app is an own channel: no third-party commission or platform fee.
        commission: AMOUNT_UNKNOWN,
        platformFees: AMOUNT_UNKNOWN,
        paymentGatewayFee: AMOUNT_UNKNOWN,
        adjustments: AMOUNT_UNKNOWN,
        totalDeductions: AMOUNT_UNKNOWN,
      }, feeLine(row, 'delivery', 'Delivery Fee (RM)')), null)
    }

    const revenue = cell(row, 'Restaurant Revenue')
    // Restaurant Revenue is tax-inclusive. A stated SST wins; otherwise it is
    // calculated at 6% inside that revenue. SST on foodpanda's own commission
    // is a fee tax, never the customer's SST, so it never feeds this field.
    const statedTax = cell(row, 'SST On Restaurant Revenue')
    const tax = statedTax.kind === 'value' ? statedTax : taxFromInclusive(revenue)
    const netSales = subtractAmounts(revenue, tax)
    const grossSales = cell(row, 'Products Value Paid By Customer')
    const payout = cell(row, 'Payable Amount')
    // foodpanda Commission is already a positive charge. Its 8% SST stays in
    // adjustments, never in commission.
    const commission = cell(row, 'foodpanda Commission')
    return stage(normalizedRow(date, source, {
      grossSales, netSales, tax,
      // The whole customer reduction, including promotions this export does not
      // itemise. Vendor voucher plus vendor discount reconciles to revenue but
      // on the tax-inclusive basis, which would leave gross − discount ≠ net.
      discount: subtractAmounts(grossSales, netSales),
      // No foodpanda invoice appendix carries a service-charge column.
      serviceCharge: amount('0'),
      // Narrow itemized platform fee: Waiting Time Fee + Packaging Fees Paid By Customer.
      platformFees: addAmounts(
        optionalCharge(row, 'Waiting Time Fee'),
        optionalCharge(row, 'Packaging Fees Paid By Customer'),
      ),
      commission,
      paymentGatewayFee: AMOUNT_UNKNOWN,
      // SST on foodpanda commission (8%) is a fee tax, an adjustment not commission.
      adjustments: cell(row, 'SST on foodpanda commission'),
      totalDeductions: subtractAmounts(revenue, payout),
      payout,
    }, feeLine(row, 'commission', 'foodpanda Commission', 'SST on foodpanda commission')), null)
  })

  if (missingKeyRows && !missingIdentity.length) {
    issues.push({
      severity: 'error',
      code: 'blank_source_record_key',
      message: `${missingKeyRows.toLocaleString()} financial rows have a blank `
        + `${profile.identityColumns.join(' / ')}, so they cannot be approved. A reviewer must reject `
        + 'them with a note, or Finance must supply an export that identifies every sale.',
    })
  }

  reportOutOfPeriod()
  return buildResult(sheetName, headerIndex + 1, staged, issues)
}

type OutOfPeriod = (date: string) => string | null

/**
 * `FOODPANDA_COMPILED.xlsx`: order-level Appendix A and additional-charge
 * Appendix B share one workbook. Appendix A is mapped per order; Appendix B is
 * mapped per charge line and attributed to an outlet through the Appendix A
 * invoice → outlet map, because Appendix B itself prints no outlet name.
 *
 * Both sheets are read in one pass, so Appendix A can be found even when it is
 * not the first sheet. Neither sheet being present returns null, which lets the
 * caller fall through to the outlet-daily path.
 */
function parseFoodpandaCompiled(
  sheets: Array<{ name: string; rows: unknown[][] }>,
  outOfPeriod: OutOfPeriod,
  reportOutOfPeriod: () => void,
): ParsedImport {
  const issues: ParseIssue[] = []
  const staged: StagedRow[] = []
  let sheetName = ''
  let headerRowNumber: number | null = null

  // Appendix A — order-level. Detection guarantees it is present.
  const appendixA = sheets.find(sheet => findHeaderIn(sheet, FOODPANDA_APPENDIX_A.headerColumns) >= 0)!
  const aHeaderIndex = findHeaderIn(appendixA, FOODPANDA_APPENDIX_A.headerColumns)
  const aHeader = appendixA.rows[aHeaderIndex].map(String)
  sheetName = appendixA.name
  headerRowNumber = aHeaderIndex + 1
  requireColumns(aHeader, FOODPANDA_APPENDIX_A.readsColumns, issues)
  const a = headerReader(aHeader)

  // Invoice → outlet, so Appendix B charge lines can be attributed without
  // inventing a name. Built from the same file's Appendix A; a stable key is
  // deliberately NOT taken from it (Appendix B has none).
  const invoiceOutlet = new Map<string, string>()
  for (const row of appendixA.rows.slice(aHeaderIndex + 1)) {
    const invoice = a.at(row, 'Invoice Number')
    const outlet = a.at(row, FOODPANDA_APPENDIX_A.outletColumn)
    if (invoice !== null && invoice !== undefined && typeof outlet === 'string' && outlet) {
      invoiceOutlet.set(String(invoice).trim(), outlet)
    }
  }

  let missingKeyRows = 0

  appendixA.rows.forEach((row, index) => {
    if (index <= aHeaderIndex) return
    const outletCell = a.at(row, FOODPANDA_APPENDIX_A.outletColumn)
    const outletName = typeof outletCell === 'string' ? outletCell : null
    const stage = (normalized: NormalizedRow | null, skipReason: string | null) => {
      const key = normalized ? normalizeKey(a, row, FOODPANDA_APPENDIX_A.identityColumns) : null
      if (normalized && !key) missingKeyRows++
      staged.push({ sourceRowNumber: index + 1, raw: rawByHeader(row, aHeader), normalized, sourceRecordKey: key, skipReason, outletName })
    }
    if (row.every(value => value === null || value === '')) return stage(null, 'Blank row')
    const date = firstDate(row, FOODPANDA_APPENDIX_A.dateColumns, a.at)
    if (!date) return stage(null, `No usable date in "${FOODPANDA_APPENDIX_A.dateColumns.join(' / ')}"`)
    if (!outletName) return stage(null, `No outlet name in "${FOODPANDA_APPENDIX_A.outletColumn}"`)
    if (isSisterBrand(outletName)) return stage(null, 'Sister brand, not a US Pizza outlet')
    const outside = outOfPeriod(date)
    if (outside) return stage(null, outside)

    // Corporate net sales is the stated commission base (Restaurant Revenue
    // ÷ 1.06, verified: CB + SST On Restaurant Revenue = Restaurant Revenue on
    // 3,250 of 3,309 real rows). The customer's 6% SST is read from its own
    // column — never recalculated from the base, because the real file's
    // effective food-tax rate is not exactly 6% on every row.
    const revenue = a.cell(row, 'Restaurant Revenue')
    const netSales = a.cell(row, 'foodpanda Commission Base')
    const grossSales = a.cell(row, 'Products Value Paid By Customer')
    const statedTax = a.cell(row, 'SST On Restaurant Revenue')
    const tax = statedTax.kind === 'value' ? statedTax : taxFromInclusive(revenue)
    const payout = a.cell(row, 'Payable Amount')
    // foodpanda Commission plus its 8% SST, stored as one unsigned magnitude —
    // the same convention the legacy FoodPanda path uses for its commission.
    const commission = addAmounts(
      a.cell(row, 'foodpanda Commission'),
      a.optionalComponent(row, 'SST on foodpanda commission'),
    )
    return stage(normalizedRow(date, 'FoodPanda', {
      grossSales, netSales, tax, payout, commission,
      // The whole customer reduction on the tax-inclusive basis: gross − net
      // would otherwise not foot, exactly as the legacy path explains.
      discount: subtractAmounts(grossSales, netSales),
      // Pandabox / targeting / waiting-time charges the statement may carry.
      platformFees: addAmounts(
        a.optionalCharge(row, 'Pandabox Fee Paid By Vendor'),
        a.optionalCharge(row, 'Waiting Time Fee'),
        a.optionalCharge(row, 'Customer Targeting Fee'),
      ),
      // No service charge applies to a foodpanda order.
      serviceCharge: amount('0'),
      paymentGatewayFee: AMOUNT_UNKNOWN,
      // SST on commission is already inside `commission` above, so adjustments
      // stay absent for an order line.
      totalDeductions: subtractAmounts(revenue, payout),
    }, [
      ...a.feeLine(row, 'commission', 'foodpanda Commission', 'SST on foodpanda commission'),
    ]), null)
  })

  // Appendix B — additional charges. The sheet states no outlet, only an
  // invoice and a vendor code, so the outlet comes from the Appendix A map.
  const appendixB = sheets.find(sheet => findHeaderIn(sheet, FOODPANDA_APPENDIX_B.headerColumns) >= 0)
  if (appendixB) {
    const bHeaderIndex = findHeaderIn(appendixB, FOODPANDA_APPENDIX_B.headerColumns)
    const bHeader = appendixB.rows[bHeaderIndex].map(String)
    requireColumns(bHeader, FOODPANDA_APPENDIX_B.readsColumns, issues)
    const b = headerReader(bHeader)
    issues.push({
      severity: 'error',
      code: 'no_source_record_key',
      message: `${appendixB.name} charges carry no order or receipt identifier — only an invoice and a `
        + 'vendor code — so their rows cannot carry the stable source key publication requires. They are '
        + 'staged and attributed to an outlet where the invoice is known. A reviewer cannot approve them.',
    })
    appendixB.rows.forEach((row, index) => {
      if (index <= bHeaderIndex) return
      const invoice = b.at(row, FOODPANDA_APPENDIX_B.invoiceColumn)
      const outletName = invoice === null || invoice === undefined
        ? null
        : invoiceOutlet.get(String(invoice).trim()) ?? null
      const stage = (normalized: NormalizedRow | null, skipReason: string | null) => {
        staged.push({ sourceRowNumber: index + 1, raw: rawByHeader(row, bHeader), normalized, sourceRecordKey: null, skipReason, outletName })
      }
      if (row.every(value => value === null || value === '')) return stage(null, 'Blank row')
      const date = firstDate(row, FOODPANDA_APPENDIX_B.dateColumns, b.at)
      if (!date) return stage(null, `No usable date in "${FOODPANDA_APPENDIX_B.dateColumns.join(' / ')}"`)
      if (!outletName) return stage(null, 'No outlet for this invoice in the Appendix A rows')
      if (isSisterBrand(outletName)) return stage(null, 'Sister brand, not a US Pizza outlet')
      const outside = outOfPeriod(date)
      if (outside) return stage(null, outside)

      const category = String(b.at(row, FOODPANDA_APPENDIX_B.categoryColumn) ?? '')
      const netTotal = b.cell(row, FOODPANDA_APPENDIX_B.netTotalColumn)
      // Every Appendix B category is subject to the 8% service tax on platform
      // services; `Subject to VAT rate` is read, and a 0% row then contributes
      // no tax. A missing rate column is treated as subject to tax, matching the
      // file (541 of 541 real rows state 8%).
      const vatRate = String(b.at(row, 'Subject to VAT rate') ?? '').replace(/\s/g, '')
      const subjectToTax = b.has('Subject to VAT rate') ? vatRate === '8%' : true
      const withTax = subjectToTax ? scaleAmount(netTotal, 108n, 100n) : netTotal

      if ((FOODPANDA_AD_CATEGORIES as readonly string[]).includes(category)) {
        // Advertising spend = base + 8% SST, stored as a signed expense to match
        // the Grab advertisement convention (a credit keeps its sign).
        return stage(normalizedRow(date, 'FoodPanda', {
          advertisingSpend: withTax,
        }, b.feeLine(row, 'marketing', FOODPANDA_APPENDIX_B.netTotalColumn)), null)
      }
      if ((FOODPANDA_CANCELLATION_CATEGORIES as readonly string[]).includes(category)) {
        // Cancellation orders and manual adjustments: signed, credits included.
        return stage(normalizedRow(date, 'FoodPanda', { adjustments: netTotal }), null)
      }
      // Any other category is a narrow platform fee (Platform Fee, Platform
      // Performance Fee, a subscription credit, …), base + its tax.
      return stage(normalizedRow(date, 'FoodPanda', {
        platformFees: withTax,
      }, b.feeLine(row, 'service', FOODPANDA_APPENDIX_B.netTotalColumn)), null)
    })
  }

  if (missingKeyRows) {
    issues.push({
      severity: 'error',
      code: 'blank_source_record_key',
      message: `${missingKeyRows.toLocaleString()} order rows have a blank `
        + `${FOODPANDA_APPENDIX_A.identityColumns.join(' / ')}, so they cannot be approved. A reviewer `
        + 'must reject them with a note, or Finance must supply an export that identifies every order.',
    })
  }

  reportOutOfPeriod()
  return buildResult(sheetName, headerRowNumber, staged, issues)
}

/**
 * `Foodpanda_Invoice_Report.xlsx` `Invoice Master`: one row per self-billed
 * invoice, aggregated across its orders. Every figure is a stated column on the
 * sheet; nothing is recalculated except the combined `commission` total, which
 * sums the four printed commission and wastage lines (base + 8% SST each).
 */
function parseFoodpandaInvoice(
  sheets: Array<{ name: string; rows: unknown[][] }>,
  outOfPeriod: OutOfPeriod,
  reportOutOfPeriod: () => void,
): ParsedImport {
  const issues: ParseIssue[] = []
  const staged: StagedRow[] = []
  const sheet = sheets.find(candidate => findHeaderIn(candidate, FOODPANDA_INVOICE_MASTER.headerColumns) >= 0)!
  const headerIndex = findHeaderIn(sheet, FOODPANDA_INVOICE_MASTER.headerColumns)
  const header = sheet.rows[headerIndex].map(String)
  requireColumns(header, FOODPANDA_INVOICE_MASTER.readsColumns, issues)
  issues.push(FOODPANDA_INVOICE_NO_IDENTITY)
  const m = headerReader(header)

  sheet.rows.forEach((row, index) => {
    if (index <= headerIndex) return
    const outletCell = m.at(row, FOODPANDA_INVOICE_MASTER.outletColumn)
    const outletName = typeof outletCell === 'string' ? outletCell : null
    const stage = (normalized: NormalizedRow | null, skipReason: string | null) => {
      staged.push({ sourceRowNumber: index + 1, raw: rawByHeader(row, header), normalized, sourceRecordKey: null, skipReason, outletName })
    }
    if (row.every(value => value === null || value === '')) return stage(null, 'Blank row')
    // The sheet ends with a "TOTAL (respects filters)" footer row.
    if (typeof outletCell === 'string' && /^TOTAL/i.test(outletCell)) return stage(null, 'Total row')
    const date = firstDate(row, FOODPANDA_INVOICE_MASTER.dateColumns, m.at)
    if (!date) return stage(null, `No usable date in "${FOODPANDA_INVOICE_MASTER.dateColumns.join(' / ')}"`)
    if (!outletName) return stage(null, `No outlet name in "${FOODPANDA_INVOICE_MASTER.outletColumn}"`)
    if (isSisterBrand(outletName)) return stage(null, 'Sister brand, not a US Pizza outlet')
    const outside = outOfPeriod(date)
    if (outside) return stage(null, outside)

    // P&L net sales is the printed Sales Value Excl. SST; the customer's 6% SST
    // is its own printed column, never recalculated (the real file's blended
    // rate is below 6%, so a calculation would invent figures).
    const netSales = m.cell(row, 'Sales Value Excl. SST (RM)')
    const tax = m.cell(row, 'Sales SST 6% (RM)')
    const grossSales = addAmounts(netSales, tax)
    // Commission = Commission Base + Commission SST + Wastage Base + Wastage
    // SST, stored unsigned like every other commission field.
    const commission = addAmounts(
      m.cell(row, 'Commission Base (RM)'),
      m.cell(row, 'Commission SST (RM)'),
      m.cell(row, 'Wastage Commission Base (RM)'),
      m.cell(row, 'Wastage Commission SST (RM)'),
    )
    // Advertising = taxable fees base + their 8% SST.
    const advertisingSpend = addAmounts(
      m.cell(row, 'Fees & Adj (SST) Base (RM)'),
      m.cell(row, 'Fees & Adj (SST) SST (RM)'),
    )
    // Platform campaign fees = Pandabox + Targeted Cust. + Waiting Time, base + SST each.
    const platformFees = addAmounts(
      m.cell(row, 'Pandabox Fee Base (RM)'), m.cell(row, 'Pandabox Fee SST (RM)'),
      m.cell(row, 'Targeted Cust. Fee Base (RM)'), m.cell(row, 'Targeted Cust. Fee SST (RM)'),
      m.cell(row, 'Waiting Time Fee Base (RM)'), m.cell(row, 'Waiting Time Fee SST (RM)'),
    )
    // Non-SST adjustments keep their sign (a credit is negative on the sheet).
    const adjustments = m.cell(row, 'Fees & Adj (Non-SST) Base (RM)')
    // Settlement: the printed Today's Earnings is the net disbursement; Total
    // Payable adds the carried-forward outstanding, which is not a sale of this
    // invoice. Earnings is preferred, Payable is the fallback.
    const earnings = m.cell(row, "Today's Earnings [a-c] (RM)")
    const payout = earnings.kind === 'value' ? earnings : m.cell(row, 'Total Payable [f]+[a-c] (RM)')
    const collected = addAmounts(netSales, tax, m.cell(row, 'Fees & Adj (Non-SST) Base (RM)'))

    return stage(normalizedRow(date, 'FoodPanda', {
      grossSales, netSales, tax, payout, commission, advertisingSpend, platformFees, adjustments,
      discount: subtractAmounts(grossSales, netSales),
      // No service charge on a self-billed foodpanda invoice.
      serviceCharge: amount('0'),
      paymentGatewayFee: AMOUNT_UNKNOWN,
      // The printed Total Incl. Tax [c] is the full platform deduction; use it
      // for the settlement identity when present, else the collected − payout.
      totalDeductions: m.has('Total Incl. Tax [c] (RM)')
        ? m.cell(row, 'Total Incl. Tax [c] (RM)')
        : subtractAmounts(collected, payout),
    }, [
      ...m.feeLine(row, 'commission', 'Commission Base (RM)', 'Commission SST (RM)'),
      ...m.feeLine(row, 'commission', 'Wastage Commission Base (RM)', 'Wastage Commission SST (RM)'),
      ...m.feeLine(row, 'marketing', 'Fees & Adj (SST) Base (RM)', 'Fees & Adj (SST) SST (RM)'),
      ...m.feeLine(row, 'service', 'Pandabox Fee Base (RM)', 'Pandabox Fee SST (RM)'),
      ...m.feeLine(row, 'service', 'Targeted Cust. Fee Base (RM)', 'Targeted Cust. Fee SST (RM)'),
      ...m.feeLine(row, 'service', 'Waiting Time Fee Base (RM)', 'Waiting Time Fee SST (RM)'),
      ...m.feeLine(row, 'refund_adjustment', 'Fees & Adj (Non-SST) Base (RM)'),
    ]), null)
  })

  reportOutOfPeriod()
  return buildResult(sheet.name, headerIndex + 1, staged, issues)
}

/** Builds the identity key from a set of columns, null when any part is blank. */
function normalizeKey(
  reader: ReturnType<typeof headerReader>,
  row: unknown[],
  columns: readonly string[],
): string | null {
  const parts = columns.map(column => {
    const value = reader.at(row, column)
    return value === null || value === undefined ? '' : String(value).trim()
  })
  return parts.every(Boolean) ? parts.join('|') : null
}

/** Browser-side preview only — see PreviewDaily. Never written to the database. */
function preview(staged: StagedRow[], source: SalesSource): PreviewDaily[] {
  const groups = new Map<string, PreviewDaily>()
  for (const row of staged) {
    if (!row.normalized || !row.outletName) continue
    const key = `${row.normalized.salesDate}|${row.outletName}`
    const current = groups.get(key) ?? {
      salesDate: row.normalized.salesDate, outletName: row.outletName, source, netSales: null, recordCount: 0,
    }
    const netSales = row.normalized.netSales
    if (typeof netSales === 'string') current.netSales = (current.netSales ?? 0) + Number(netSales)
    current.recordCount += 1
    groups.set(key, current)
  }
  return [...groups.values()]
}
