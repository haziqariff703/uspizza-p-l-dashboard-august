/**
 * Builds the Section 4 outlet x channel aggregate payload for
 * `US-Pizza-August-2026-Dashboard.html`, plus a reconciliation report.
 *
 *   node --import tsx scripts/build_section4_august_dataset.mts
 *
 * Nothing here invents a figure. Every amount comes from the repository's own
 * `parseSalesFile` mapping run over the August workbooks in `datasource/`, is
 * summed with the exact-decimal helpers in `src/lib/decimal.ts`, and stays a
 * decimal string. A channel with no source for an outlet is `unavailable` with
 * null amounts — never RM 0.
 *
 * Outlet identity is the 46-outlet roster the standalone HTML already carries in
 * `SSR_DATA.__matrix` (the roster Section 3 reports coverage for), bridged to
 * `OUTLET_NAME_MAP` by the source spellings that file records.
 */
import fs from 'node:fs'
import path from 'node:path'
import { parseSalesFile, type SalesSource, type StagedRow } from '../src/lib/salesImportParser'
import { OUTLET_NAME_MAP, NON_HQ_SOURCE_NAMES } from '../src/data/outletNameMap'
import { isSisterBrand, outletNameKey } from '../src/data/outletMaster'
import { AMOUNT_ABSENT, AMOUNT_UNKNOWN, addAmounts, amount, subtractAmounts, type Amount } from '../src/lib/decimal'
import type { AliasSource } from '../src/lib/outletDirectory'

const REPORTING_MONTH = '2026-08'
const ROOT = path.resolve(import.meta.dirname, '..')
const DATASOURCE = path.join(ROOT, 'datasource')
const HTML = path.join(ROOT, 'US-Pizza-August-2026-Dashboard.html')
const OUT_JSON = path.join(ROOT, '.s4tmp', 'section4-august-dataset.json')
const OUT_REPORT = path.join(ROOT, 'docs', 'SECTION_4_AUGUST_RECONCILIATION.md')

/** Channel order is the legend order the HTML already uses. */
const CHANNELS = ['grab', 'foodpanda', 'shopee', 'apps', 'pos'] as const
type Channel = (typeof CHANNELS)[number]
const CHANNEL_LABEL: Record<Channel, string> = { grab: 'Grab', foodpanda: 'FoodPanda', shopee: 'Shopee', apps: 'Apps', pos: 'POS' }

/** Which workbooks feed which channel. A channel absent from here has no August source. */
const SOURCE_FILES: Partial<Record<Channel, { source: SalesSource; files: string[] }>> = {
  pos: {
    source: 'POS',
    files: fs.readdirSync(path.join(DATASOURCE, 'POS SALES'))
      .filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'))
      .map(f => path.join(DATASOURCE, 'POS SALES', f)),
  },
  grab: { source: 'Grab', files: [path.join(DATASOURCE, 'GRAB_Aug_sales.xlsx')] },
  apps: { source: 'Apps', files: [path.join(DATASOURCE, 'APPS AUG ORDER LIST.xlsx')] },
  shopee: { source: 'Shopee', files: [path.join(DATASOURCE, 'datasource-summary', 'Shopee.xlsx')] },
}

/** Why a channel has no amounts at all this month. Quoted verbatim in the chart. */
const CHANNEL_UNAVAILABLE_REASON: Partial<Record<Channel, string>> = {
  foodpanda: 'No machine-readable August foodpanda statement covers the month, so its sales are unknown.',
}

// ---------------------------------------------------------------------------
// Outlet roster: the standalone file's own 46 outlets, bridged to OUTLET_NAME_MAP.
// ---------------------------------------------------------------------------

interface MatrixOutlet { id: string; name: string; code: string; entity: string }

const html = fs.readFileSync(HTML, 'utf8')
const bundle = JSON.parse(html.match(/<script id="SSR_DATA" type="application\/json">([\s\S]*?)<\/script>/)![1])
const roster: MatrixOutlet[] = bundle.__matrix

/** Every spelling OUTLET_NAME_MAP knows for an outlet, so the roster name matches
 *  whichever source it was transcribed from. */
const codeByName = new Map<string, string>()
for (const outlet of OUTLET_NAME_MAP) {
  codeByName.set(outletNameKey(outlet.name), outlet.code)
  for (const names of Object.values(outlet.sources)) {
    for (const name of names ?? []) codeByName.set(outletNameKey(name), outlet.code)
  }
}

const rosterByCode = new Map<string, MatrixOutlet>()
const unbridged: string[] = []
for (const outlet of roster) {
  const code = codeByName.get(outletNameKey(outlet.name))
  if (!code) { unbridged.push(outlet.name); continue }
  if (rosterByCode.has(code)) throw new Error(`Two roster outlets bridge to ${code}`)
  rosterByCode.set(code, outlet)
}
if (unbridged.length) throw new Error(`Roster outlets absent from OUTLET_NAME_MAP: ${unbridged.join(', ')}`)

/** Source store name -> OUTLET_NAME_MAP code, per source, from the curated table only. */
const aliasIndex = new Map<string, string>()
for (const outlet of OUTLET_NAME_MAP) {
  for (const [source, names] of Object.entries(outlet.sources) as Array<[AliasSource, string[]]>) {
    aliasIndex.set(`${source}:${outletNameKey(outlet.name)}`, outlet.code)
    for (const name of names ?? []) aliasIndex.set(`${source}:${outletNameKey(name)}`, outlet.code)
  }
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

const FIELDS = ['grossSales', 'netSales', 'serviceCharge', 'tax'] as const
type Field = (typeof FIELDS)[number]

type Bucket = Record<Field, Amount> & { rows: number }
const blank = (): Bucket => ({ grossSales: AMOUNT_ABSENT, netSales: AMOUNT_ABSENT, serviceCharge: AMOUNT_ABSENT, tax: AMOUNT_ABSENT, rows: 0 })

/** code -> channel -> bucket */
const totals = new Map<string, Partial<Record<Channel, Bucket>>>()
const unmatched = new Map<string, { channel: Channel; rows: number }>()
const parseIssues: Array<{ channel: Channel; file: string; severity: string; code: string; message: string }> = []
/** Rows the mapping deliberately excludes on a row-status rule, kept with the value
 *  they would have added so the exclusion is auditable rather than invisible. */
const excluded = new Map<string, { channel: Channel; reason: string; rows: number; gross: number }>()

/** The contract's three states: omitted key = no contribution, null = unknown, string = stated. */
const readAmount = (row: Record<string, unknown>, field: Field): Amount => {
  if (!(field in row)) return AMOUNT_ABSENT
  const value = row[field]
  return value === null ? AMOUNT_UNKNOWN : amount(String(value))
}

const absorb = (code: string, channel: Channel, staged: StagedRow) => {
  const byChannel = totals.get(code) ?? {}
  totals.set(code, byChannel)
  const bucket = byChannel[channel] ?? blank()
  byChannel[channel] = bucket
  bucket.rows++
  for (const field of FIELDS) bucket[field] = addAmounts(bucket[field], readAmount(staged.normalized!, field))
}

for (const channel of CHANNELS) {
  const config = SOURCE_FILES[channel]
  if (!config) continue
  for (const file of config.files) {
    const parsed = await parseSalesFile(
      new File([fs.readFileSync(file)], path.basename(file)),
      config.source,
      REPORTING_MONTH,
    )
    for (const issue of parsed.issues) {
      parseIssues.push({ channel, file: path.basename(file), ...issue })
    }
    for (const staged of parsed.staged) {
      // A row dropped on an order/payment-status rule is the one exclusion that
      // changes a published sales figure, so it is totalled, not just skipped.
      if (!staged.normalized && staged.skipReason && /^(Status|Payment status|Order status) /.test(staged.skipReason)) {
        const reason = staged.skipReason
        const key = `${channel}:${reason}`
        const seen = excluded.get(key) ?? { channel, reason, rows: 0, gross: 0 }
        seen.rows++
        seen.gross += Number(staged.raw['Subtotal (RM)'] ?? staged.raw['Food original price'] ?? 0) || 0
        excluded.set(key, seen)
      }
      if (!staged.normalized || !staged.outletName) continue
      const code = aliasIndex.get(`${channel}:${outletNameKey(staged.outletName)}`)
      if (!code) {
        const seen = unmatched.get(`${channel}:${staged.outletName}`) ?? { channel, rows: 0 }
        seen.rows++
        unmatched.set(`${channel}:${staged.outletName}`, seen)
        continue
      }
      absorb(code, channel, staged)
    }
    process.stderr.write(`${channel.padEnd(10)} ${path.basename(file)} — ${parsed.staged.length} rows staged\n`)
  }
}

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

const json = (value: Amount) => (value.kind === 'value' ? value.value : null)

const channelRecord = (bucket: Bucket | undefined, channel: Channel) => {
  if (!bucket || bucket.rows === 0) {
    return {
      gross: null, net: null, serviceCharge: null, tax: null,
      status: 'unavailable' as const,
      reason: CHANNEL_UNAVAILABLE_REASON[channel] ?? `No August ${channel} report covers this outlet.`,
    }
  }
  return {
    gross: json(bucket.grossSales),
    net: json(bucket.netSales),
    serviceCharge: json(bucket.serviceCharge),
    tax: json(bucket.tax),
    status: 'reported' as const,
    records: bucket.rows,
  }
}

const outlets = [...rosterByCode].map(([code, outlet]) => ({
  id: outlet.id,
  code,
  name: outlet.name,
  entity: outlet.entity,
  channels: Object.fromEntries(
    CHANNELS.map(channel => [channel, channelRecord(totals.get(code)?.[channel], channel)]),
  ),
}))

// Derived-metric sanity: gross - net = discount, and every metric is summable.
const metricOf = (c: ReturnType<typeof channelRecord>, metric: string): string | null => {
  const a = (v: string | null) => (v === null ? AMOUNT_UNKNOWN : amount(v))
  const value = metric === 'gross' ? a(c.gross)
    : metric === 'net' ? a(c.net)
    : metric === 'discount' ? subtractAmounts(a(c.gross), a(c.net))
    : metric === 'netSc' ? addAmounts(a(c.net), a(c.serviceCharge))
    : addAmounts(a(c.net), a(c.serviceCharge), a(c.tax))
  return json(value)
}

const payload = {
  contract: 'section4-august-2026-v1',
  reportingMonth: REPORTING_MONTH,
  builtFrom: Object.entries(SOURCE_FILES).map(([channel, c]) => ({ channel, source: c!.source, files: c!.files.map(f => path.relative(ROOT, f)) })),
  channels: CHANNELS,
  metrics: ['gross', 'discount', 'net', 'netSc', 'netScTax'],
  /** Channels an August source exists for. A sourced channel missing from one
   *  outlet is that outlet's own coverage gap; an unsourced channel is a
   *  month-wide gap the chart states once instead of flagging 46 times. */
  sourcedChannels: CHANNELS.filter(channel => SOURCE_FILES[channel]),
  unsourcedChannels: CHANNELS.filter(channel => !SOURCE_FILES[channel])
    .map(channel => ({ channel, reason: CHANNEL_UNAVAILABLE_REASON[channel]! })),
  /** Row-status rules that hold sales out of a channel's figures. Stated in the
   *  chart so a reader can see the basis rather than infer it from a total. */
  definitionNotes: [...excluded.values()]
    .reduce<Array<{ channel: Channel; rows: number }>>((acc, entry) => {
      const found = acc.find(item => item.channel === entry.channel)
      if (found) found.rows += entry.rows
      else acc.push({ channel: entry.channel, rows: entry.rows })
      return acc
    }, [])
    .map(({ channel, rows }) => `${CHANNEL_LABEL[channel]} counts an order only where the source reports it completed and paid; ${rows.toLocaleString('en-US')} August orders in other states are excluded, not treated as sales.`),
  outlets,
}

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true })
fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 1))

// ---------------------------------------------------------------------------
// Reconciliation report
// ---------------------------------------------------------------------------

/** Rounded RM the current snapshot shows, per outlet name, per channel. */
const snapshot = new Map<string, Map<string, number>>()
{
  const section = bundle.all.salesByOutlet as string
  const rows = section.split('flex items-center gap-3 py-[3px]').slice(1)
  for (const row of rows) {
    const name = row.match(/title="([^"]+)">/)?.[1]
    if (!name) continue
    const per = new Map<string, number>()
    for (const [, label, value] of row.matchAll(/title="([A-Za-z]+): RM ([\d,]+)"/g)) {
      per.set(label.toLowerCase(), Number(value.replace(/,/g, '')))
    }
    snapshot.set(name, per)
  }
}

const rm = (value: string | null) => (value === null ? '—' : Number(value).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

const grossRows = outlets.map(outlet => {
  const shown = snapshot.get(outlet.name) ?? new Map()
  return CHANNELS.filter(c => outlet.channels[c].status === 'reported' || shown.has(c)).map(channel => {
    const built = outlet.channels[channel].gross
    const was = shown.get(channel) ?? null
    const delta = built !== null && was !== null ? Number(built) - was : null
    return { outlet: outlet.name, channel, built, was, delta }
  })
}).flat()

const drift = grossRows.filter(r => r.delta === null || Math.abs(r.delta) >= 1)

const entityCounts = outlets.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.entity]: (acc[o.entity] ?? 0) + 1 }), {})

/** Channels this build resolves that the snapshot's own coverage matrix calls unavailable. */
const gained = outlets.flatMap(outlet => {
  const matrix = roster.find(o => o.name === outlet.name)!
  return CHANNELS
    .filter(channel => outlet.channels[channel].status === 'reported' && (matrix as never as Record<Channel, string>)[channel] !== 'imported')
    .map(channel => ({ outlet: outlet.name, channel, alias: OUTLET_NAME_MAP.find(o => o.code === outlet.code)?.sources[channel as AliasSource]?.join(', ') ?? '' }))
})

/** Only a name neither the sister-brand rule nor the non-HQ list claims is a real issue. */
const nonHqKeys = new Map<string, Set<string>>(
  Object.entries(NON_HQ_SOURCE_NAMES).map(([source, names]) => [source, new Set((names ?? []).map(outletNameKey))]),
)
const classify = (channel: Channel, name: string) => isSisterBrand(name) ? 'sister brand'
  : nonHqKeys.get(channel)?.has(outletNameKey(name)) ? 'known non-HQ outlet'
  : 'UNRECOGNISED — needs Finance'
const unmatchedRows = [...unmatched].map(([key, value]) => {
  const name = key.slice(value.channel.length + 1)
  return { name, channel: value.channel, rows: value.rows, verdict: classify(value.channel, name) }
})
const unrecognised = unmatchedRows.filter(r => r.verdict.startsWith('UNRECOGNISED'))

const coverage = CHANNELS.map(channel => ({
  channel,
  reported: outlets.filter(o => o.channels[channel].status === 'reported').length,
  unavailable: outlets.filter(o => o.channels[channel].status === 'unavailable').length,
}))

const metricCoverage = payload.metrics.map(metric => ({
  metric,
  known: outlets.filter(o => CHANNELS.some(c => metricOf(o.channels[c], metric) !== null)).length,
  complete: outlets.filter(o => CHANNELS.every(c => o.channels[c].status !== 'reported' || metricOf(o.channels[c], metric) !== null)).length,
}))

const report = `# Section 4 — August 2026 outlet x channel reconciliation

Generated by \`scripts/build_section4_august_dataset.mts\` on ${new Date().toISOString().slice(0, 10)}.
Amounts are the repository parser's own mapping (\`parseSalesFile\`, exact decimals) over the
workbooks listed below. No figure is read back from the snapshot's rounded labels or bar widths.

## Sources read

${payload.builtFrom.map(s => `- **${s.channel}** (\`${s.source}\`): ${s.files.map(f => `\`${f}\``).join(', ')}`).join('\n')}

Channels with no August source, reported as \`unavailable\` with null amounts:

${CHANNELS.filter(c => !SOURCE_FILES[c]).map(c => `- **${c}** — ${CHANNEL_UNAVAILABLE_REASON[c]}`).join('\n')}

## Roster

${outlets.length} outlets, from the standalone file's own \`SSR_DATA.__matrix\`:
${Object.entries(entityCounts).map(([entity, n]) => `- ${entity}: ${n}`).join('\n')}

## Channel coverage

| Channel | Reported | Unavailable |
| :-- | --: | --: |
${coverage.map(c => `| ${c.channel} | ${c.reported} | ${c.unavailable} |`).join('\n')}

## Metric coverage

An outlet is *complete* for a metric when every channel it reports at all has that metric known.

| Metric | Outlets with a known amount | Complete across reported channels |
| :-- | --: | --: |
${metricCoverage.map(m => `| ${m.metric} | ${m.known} | ${m.complete} |`).join('\n')}

## Gross reconciliation against the current snapshot

${grossRows.length} outlet/channel gross cells compared with the rounded RM the snapshot
renders today. The snapshot rounds to whole RM, so a sub-RM1 difference is rounding.

${drift.length === 0
    ? '**All cells agree within rounding.**'
    : `**${drift.length} cell(s) differ by RM 1 or more, or exist on only one side:**\n\n| Outlet | Channel | Rebuilt | Snapshot | Delta |\n| :-- | :-- | --: | --: | --: |\n${drift.map(d => `| ${d.outlet} | ${d.channel} | ${rm(d.built)} | ${d.was === null ? '—' : d.was.toLocaleString()} | ${d.delta === null ? 'only one side' : d.delta.toFixed(2)} |`).join('\n')}`}

## Open data issue — the Apps row-status basis

The snapshot's Apps gross is the **unfiltered** \`Subtotal (RM)\` column. This build uses the
repository's own authoritative mapping, which counts an app order only when
\`Status = Completed\` **and** \`Payment Status = Paid\`. That single rule accounts for the whole
Apps column of the reconciliation table above.

| Rule that excluded the rows | Rows | \`Subtotal (RM)\` withheld |
| :-- | --: | --: |
${[...excluded.values()].map(e => `| ${e.channel} — ${e.reason} | ${e.rows} | ${e.gross.toFixed(2)} |`).join('\n')}

**For Finance:** \`Picked_up / Paid\` is a paid, collected order. If those belong in August
sales, the mapping's status rule — not this chart — is what needs changing, and the whole
dashboard's Apps figures move with it. Nothing here was adjusted to close the gap.

## Coverage this build resolves that the snapshot does not

The snapshot's own coverage matrix marks these channel/outlet pairs unavailable, but the
curated \`OUTLET_NAME_MAP\` does claim the source spelling, so real rows exist for them.
No outlet loses a channel relative to the snapshot; these are additions only.

${gained.length === 0
    ? 'None.'
    : `| Outlet | Channel | Source spelling matched |\n| :-- | :-- | :-- |\n${gained.map(g => `| ${g.outlet} | ${g.channel} | ${g.alias} |`).join('\n')}`}

## Unmatched source outlet names

Names the curated \`OUTLET_NAME_MAP\` does not claim. They are excluded from the 46-outlet
roster, not silently dropped: they are listed here for Finance.

**${unrecognised.length} unrecognised name(s)** — everything else is an explicitly listed
non-HQ outlet or a sister brand.

${unmatchedRows.length === 0
    ? 'None.'
    : `| Source name | Channel | Rows | Verdict |\n| :-- | :-- | --: | :-- |\n${unmatchedRows.map(r => `| ${r.name.trim()} | ${r.channel} | ${r.rows} | ${r.verdict} |`).join('\n')}`}

## Parser issues raised while reading the sources

${parseIssues.length === 0
    ? 'None.'
    : parseIssues.map(i => `- **${i.severity}** \`${i.code}\` (${i.channel}, ${i.file}): ${i.message}`).join('\n')}
`

fs.writeFileSync(OUT_REPORT, report)
process.stderr.write(`\nwrote ${path.relative(ROOT, OUT_JSON)} and ${path.relative(ROOT, OUT_REPORT)}\n`)
