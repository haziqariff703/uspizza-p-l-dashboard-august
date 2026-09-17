import type { ParsedImport, ParseIssue, SalesSource } from './salesImportParser'
import { MONEY_KEYS } from './salesImportParser'
import type { DailyTotal } from './salesDailyTotals'

/**
 * The gate between parsing and writing. Everything here is structural: does this
 * file have the shape we can store, are its dates inside the month the user
 * chose, is every money value something the `numeric(14,2)` columns will accept.
 *
 * It decides nothing about outlet identity — that is `outletMatcher.ts` — and it
 * never repairs a value. A fatal finding refuses the import before a single row
 * is written, so a half-understood file cannot become "imported".
 *
 * (The Phase 2 handoff suggested Zod for this. These are plain functions instead,
 * because the checks are all first-order and the project has no Zod dependency;
 * see the note in the handover summary. The validations themselves are the ones
 * the handoff lists.)
 */

const SUPPORTED_SOURCES: SalesSource[] = ['POS', 'Grab', 'FoodPanda', 'Shopee', 'Apps']
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/
const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
/** Exactly what `numeric(14,2)` and the decimal helpers accept. */
const CANONICAL_AMOUNT = /^-?[0-9]+(\.[0-9]+)?$/

/**
 * Parser issues that describe the retired publication contract rather than this
 * schema. The simple schema stores daily totals and has no approval step, so a
 * source without a per-transaction key (POS is one, by design) is still importable.
 */
const NOT_FATAL_CODES = new Set(['no_source_record_key', 'blank_source_record_key', 'out_of_period_row', 'missing_column'])

export interface ValidationResult {
  ok: boolean
  /** Reasons the import must be refused before anything is written. */
  fatal: ParseIssue[]
  /** Worth showing, but the import proceeds. */
  warnings: ParseIssue[]
}

const issue = (code: string, message: string, severity: ParseIssue['severity'] = 'error'): ParseIssue =>
  ({ severity, code, message })

/**
 * Validates one parsed file and the daily totals derived from it, together:
 * the totals are what actually reaches the database, so they are what must be
 * provably well-formed.
 */
export function validateSalesImport(
  parsed: ParsedImport,
  totals: DailyTotal[],
  source: SalesSource,
  reportingMonth: string,
): ValidationResult {
  const fatal: ParseIssue[] = []

  if (!SUPPORTED_SOURCES.includes(source)) {
    fatal.push(issue('unsupported_source', `"${source}" is not a source this dashboard can read.`))
  }
  if (!MONTH.test(reportingMonth)) {
    fatal.push(issue('bad_reporting_month', `"${reportingMonth}" is not a YYYY-MM reporting month.`))
  }
  if (!parsed.staged.length) {
    fatal.push(issue('empty_file', 'The file has no rows at all below its header.'))
  }
  if (!totals.length) {
    fatal.push(issue('no_usable_rows',
      'No row in this file produced a daily total. Check the source, the reporting month, and the '
      + 'status/category filters for this export — nothing was written.'))
  }

  for (const total of totals) {
    if (!ISO_DATE.test(total.salesDate)) {
      fatal.push(issue('bad_sales_date', `"${total.salesDate}" is not a usable date (${total.outletName}).`))
      continue
    }
    if (!total.salesDate.startsWith(`${reportingMonth}-`)) {
      // The parser already excludes these; a survivor means the two disagree,
      // and a row filed under the wrong month is worse than a refused import.
      fatal.push(issue('date_outside_month',
        `${total.outletName} has a total dated ${total.salesDate}, outside ${reportingMonth}.`))
    }
    if (!Number.isInteger(total.recordCount) || total.recordCount < 1) {
      fatal.push(issue('bad_record_count', `${total.outletName} on ${total.salesDate} has no countable source rows.`))
    }
    for (const key of MONEY_KEYS) {
      const value = total.amounts[key]
      // Null is a real answer here: the source did not state this figure.
      if (value !== null && !CANONICAL_AMOUNT.test(value)) {
        fatal.push(issue('bad_amount',
          `${total.outletName} on ${total.salesDate} has a ${key} of "${value}", which is not an exact decimal.`))
      }
    }
  }

  const parserFatal = parsed.issues.filter(item => item.severity === 'error' && !NOT_FATAL_CODES.has(item.code))
  const warnings = parsed.issues.filter(item => !parserFatal.includes(item))

  return {
    ok: fatal.length === 0 && parserFatal.length === 0,
    // De-duplicated: one message per distinct code+message is enough to act on.
    fatal: [...new Map([...parserFatal, ...fatal].map(item => [`${item.code}:${item.message}`, item])).values()],
    warnings,
  }
}
