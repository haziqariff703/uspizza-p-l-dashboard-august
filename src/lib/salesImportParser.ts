import { isSisterBrand } from '../data/outletMaster'
import {
  addAmounts, amount, amountsToJson, AMOUNT_ABSENT, AMOUNT_UNKNOWN, parseDecimal, scaleAmount,
  subtractAmounts, taxFromInclusive, type Amount, type Decimal,
} from './decimal'

export type SalesSource = 'POS' | 'Grab' | 'FoodPanda' | 'Shopee' | 'Apps'

/** Bump when a profile's column mapping or arithmetic changes. Stored per import. */
export const PARSER_VERSION = '2026-09-5'
/** Bump when the outlet/alias rules change. Stored per import. */
export const MAPPING_VERSION = '2026-09-1'

/** The money keys `app_private.sales_amount` validates on publication. */
export const MONEY_KEYS = ['grossSales', 'discount', 'netSales', 'tax', 'serviceCharge', 'platformFees', 'advertisingSpend', 'payout'] as const

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
    // Category distinguishes a payment from an advertisement charge.
    identityColumns: ['Transaction ID', 'Category'],
    readsColumns: ['Category', 'Net Sales', 'Total', 'Offer', 'Discount (Merchant-Funded)', 'Tax on Order Value', 'Restaurant Service Charge', 'Amount', 'Order commission'],
  },
  FoodPanda: {
    headerColumns: ['Order Date', 'Outlet Name'],
    dateColumn: 'Order Date',
    outletColumn: 'Outlet Name',
    identityColumns: ['Order Code'],
    readsColumns: ['Products Value Paid By Customer', 'Restaurant Revenue', 'SST On Restaurant Revenue', 'foodpanda Commission', 'SST on foodpanda commission', 'Payable Amount'],
  },
  Shopee: {
    headerColumns: ['Complete Time', 'Store Name'],
    dateColumn: 'Complete Time',
    outletColumn: 'Store Name',
    identityColumns: ['Order ID'],
    readsColumns: ['Order Status', 'Food original price', 'Transaction Amount', 'Earnings'],
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
    const outside = outOfPeriod(date)
    if (outside) return stage(null, outside)

    if (source === 'Grab') {
      const category = at(row, 'Category')
      if (category === 'Payment') {
        const collected = cell(row, 'Net Sales')
        const tax = cell(row, 'Tax on Order Value')
        const serviceCharge = optionalCharge(row, 'Restaurant Service Charge')
        const payout = cell(row, 'Total')
        return stage(normalizedRow(date, source, {
          grossSales: cell(row, 'Amount'),
          netSales: subtractAmounts(collected, tax, serviceCharge),
          payout,
          discount: subtractAmounts(amount('0'), addAmounts(optionalCharge(row, 'Offer'), optionalCharge(row, 'Discount (Merchant-Funded)'))),
          tax, serviceCharge,
          // Signed: a settlement larger than net sales is a real credit, not zero.
          platformFees: subtractAmounts(collected, payout),
        }, feeLine(row, 'commission', 'Order commission')), null)
      }
      if (category === 'Advertisement') {
        return stage(normalizedRow(date, source, { advertisingSpend: cell(row, 'Amount') },
          feeLine(row, 'marketing', 'Amount')), null)
      }
      return stage(null, `Category "${String(category)}" is not a payment or advertisement line`)
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
        platformFees: subtractAmounts(collected, payout),
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
    return stage(normalizedRow(date, source, {
      grossSales, netSales, tax,
      // The whole customer reduction, including promotions this export does not
      // itemise. Vendor voucher plus vendor discount reconciles to revenue but
      // on the tax-inclusive basis, which would leave gross − discount ≠ net.
      discount: subtractAmounts(grossSales, netSales),
      // No foodpanda invoice appendix carries a service-charge column.
      serviceCharge: amount('0'),
      platformFees: subtractAmounts(revenue, cell(row, 'Payable Amount')),
      payout: cell(row, 'Payable Amount'),
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
  return {
    sheetName,
    headerRowNumber: headerIndex + 1,
    parserVersion: PARSER_VERSION,
    mappingVersion: MAPPING_VERSION,
    staged,
    previewDaily: preview(staged, source),
    issues,
  }
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
