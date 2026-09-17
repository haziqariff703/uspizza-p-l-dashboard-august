/**
 * Exact decimal arithmetic on canonical strings, for money the database will
 * parse with `app_private.sales_amount`. That function accepts only
 * `^-?[0-9]+(\.[0-9]+)?$`, so every value here must match it exactly.
 *
 * Nothing in this module uses `Number` for arithmetic: source figures are
 * scaled to BigInt and back, so RM 0.1 + RM 0.2 is 0.3 and not 0.30000000000000004.
 */
export type Decimal = string

/**
 * What a source cell says about one money field.
 *  - `value`  the source stated this amount (including a stated zero)
 *  - `unknown` the field applies here but the source did not give a usable figure
 *  - `absent`  this row makes no contribution to the field at all
 *
 * The distinction is the contract's: an omitted key means "no contribution",
 * an explicit null means "applicable but unknown", and the two aggregate very
 * differently. Never collapse either one to zero.
 */
export type Amount =
  | { kind: 'value'; value: Decimal }
  | { kind: 'unknown' }
  | { kind: 'absent' }

export const AMOUNT_UNKNOWN: Amount = { kind: 'unknown' }
export const AMOUNT_ABSENT: Amount = { kind: 'absent' }
export const amount = (value: Decimal): Amount => ({ kind: 'value', value })

const CANONICAL = /^-?[0-9]+(\.[0-9]+)?$/

interface Scaled { units: bigint; scale: number }

const toScaled = (value: Decimal): Scaled => {
  const negative = value.startsWith('-')
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.')
  const units = BigInt(whole + fraction)
  return { units: negative ? -units : units, scale: fraction.length }
}

const format = ({ units, scale }: Scaled): Decimal => {
  if (scale === 0) return units.toString()
  const negative = units < 0n
  const digits = (negative ? -units : units).toString().padStart(scale + 1, '0')
  const result = `${digits.slice(0, digits.length - scale)}.${digits.slice(digits.length - scale)}`
  return negative ? `-${result}` : result
}

const align = (values: Scaled[]): { values: bigint[]; scale: number } => {
  const scale = Math.max(...values.map(v => v.scale))
  return { values: values.map(v => v.units * 10n ** BigInt(scale - v.scale)), scale }
}

/**
 * Reads one source cell. Returns undefined when the cell holds nothing usable —
 * the caller decides whether that means `unknown` or `absent`, because only it
 * knows whether the field applies to this row.
 */
export function parseDecimal(cell: unknown): Decimal | undefined {
  if (cell === null || cell === undefined) return undefined
  if (typeof cell === 'number') {
    if (!Number.isFinite(cell)) return undefined
    const text = cell.toString()
    // Exponent notation cannot be trusted through the canonical regex.
    return CANONICAL.test(text) ? text : undefined
  }
  if (typeof cell !== 'string') return undefined

  const trimmed = cell.trim()
  if (!trimmed) return undefined
  // Accounting negatives: (1,234.50) means -1234.50.
  const bracketed = trimmed.startsWith('(') && trimmed.endsWith(')')
  const body = (bracketed ? trimmed.slice(1, -1) : trimmed)
    .replace(/^RM\s*/i, '')
    .replace(/[,\s]/g, '')
  const signed = bracketed ? (body.startsWith('-') ? body.slice(1) : `-${body}`) : body
  const normalized = signed.replace(/^\+/, '')
  return CANONICAL.test(normalized) ? normalized : undefined
}

/** Adds amounts. Any unknown input makes the result unknown, never a partial sum. */
export function addAmounts(...values: Amount[]): Amount {
  if (values.some(v => v.kind === 'unknown')) return AMOUNT_UNKNOWN
  const present = values.filter((v): v is { kind: 'value'; value: Decimal } => v.kind === 'value')
  if (!present.length) return AMOUNT_ABSENT
  const { values: units, scale } = align(present.map(v => toScaled(v.value)))
  return amount(format({ units: units.reduce((total, value) => total + value, 0n), scale }))
}

/** a - b - c … Any unknown or absent input makes the result unknown: a figure
 *  derived from something the source never stated is not a figure. */
export function subtractAmounts(from: Amount, ...rest: Amount[]): Amount {
  if (from.kind !== 'value' || rest.some(v => v.kind !== 'value')) return AMOUNT_UNKNOWN
  const parts = [from, ...rest] as Array<{ kind: 'value'; value: Decimal }>
  const { values: units, scale } = align(parts.map(v => toScaled(v.value)))
  return amount(format({ units: units.slice(1).reduce((total, value) => total - value, units[0]), scale }))
}

/** Builds the `normalized_row_json` money keys: value → string, unknown → null,
 *  absent → key omitted. */
export function amountsToJson(fields: Record<string, Amount>): Record<string, Decimal | null> {
  const json: Record<string, Decimal | null> = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value.kind === 'absent') continue
    json[key] = value.kind === 'value' ? value.value : null
  }
  return json
}

/** Read-only preview total for the browser. Never sent to the database. */
export function previewTotal(values: Array<Decimal | null | undefined>): number {
  return values.reduce<number>((total, value) => total + (value ? Number(value) : 0), 0)
}
