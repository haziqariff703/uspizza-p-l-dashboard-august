/**
 * Sections 4–6 chart island for `US-Pizza-August-2026-Dashboard.html`.
 *
 * Bundled to an inline IIFE by `scripts/build_section4_island.mts`, which also
 * injects the aggregate payload. The standalone file's vanilla shell mounts this
 * through `window.__s4mount` and unmounts it before it replaces `#views`.
 *
 * Every amount arrives as an exact decimal string. Sums happen in integer cents;
 * `Number` appears only where Recharts needs a number to draw with. A channel
 * with no August source is `null` and renders as an em dash, never as RM 0.
 */
import { useEffect, useMemo, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// --- payload -----------------------------------------------------------------

type ChannelId = 'grab' | 'foodpanda' | 'shopee' | 'apps' | 'pos'
type MetricId = 'gross' | 'discount' | 'net' | 'netSc' | 'netScTax'

interface ChannelRecord {
  gross: string | null
  net: string | null
  serviceCharge: string | null
  tax: string | null
  status: 'reported' | 'unavailable'
  reason?: string
}
interface Outlet {
  id: string
  code: string
  name: string
  entity: string
  channels: Record<ChannelId, ChannelRecord>
}
interface Dataset {
  reportingMonth: string
  channels: ChannelId[]
  sourcedChannels: ChannelId[]
  unsourcedChannels: Array<{ channel: ChannelId; reason: string }>
  definitionNotes: string[]
  outlets: Outlet[]
}

const DATA: Dataset = JSON.parse(document.getElementById('S4_DATA')!.textContent!)

/** The legend colours and labels the standalone file already uses. */
const CHANNEL_LABEL: Record<ChannelId, string> = { grab: 'Grab', foodpanda: 'FoodPanda', shopee: 'Shopee', apps: 'Apps', pos: 'POS' }
const CHANNEL_COLOR: Record<ChannelId, string> = { grab: '#00B14F', foodpanda: '#D70F64', shopee: '#EE4D2D', apps: '#C8102E', pos: '#64748B' }

const METRICS: Array<{ id: MetricId; label: string; caption: string }> = [
  { id: 'gross', label: 'Gross', caption: 'Gross Sales per HQ outlet · Menu selling price' },
  { id: 'discount', label: 'Discount', caption: 'Discount per HQ outlet · Gross Sales − Net Sales' },
  { id: 'net', label: 'Net', caption: 'Net Sales per HQ outlet · Gross Sales − Discount' },
  { id: 'netSc', label: 'Net + SC', caption: 'Net Sales + Service Charge per HQ outlet' },
  { id: 'netScTax', label: 'Net + SC + SST', caption: 'Net Sales + Service Charge + SST per HQ outlet' },
]

// --- exact money -------------------------------------------------------------

/** Decimal string (0 or 2 places, as the payload guarantees) to integer cents. */
const toCents = (value: string | null): bigint | null => {
  if (value === null) return null
  const [whole, fraction = ''] = value.split('.')
  return BigInt(whole + fraction.padEnd(2, '0').slice(0, 2))
}
const addCents = (...values: Array<bigint | null>): bigint | null =>
  values.reduce<bigint | null>((total, value) => (total === null || value === null ? null : total + value), 0n)
const centsToNumber = (cents: bigint) => Number(cents) / 100
const RM = (cents: bigint | null) => cents === null
  ? '—'
  : `RM ${(Number(cents < 0n ? -cents : cents) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/^/, cents < 0n ? '-' : '')}`
const wholeRM = (value: number) => `RM ${Math.round(value).toLocaleString('en-US')}`

/** One channel's amount for the selected metric, in cents. Null = unknown. */
const channelMetric = (record: ChannelRecord, metric: MetricId): bigint | null => {
  const net = toCents(record.net)
  const gross = toCents(record.gross)
  const sc = toCents(record.serviceCharge)
  const tax = toCents(record.tax)
  if (metric === 'gross') return gross
  if (metric === 'net') return net
  if (metric === 'discount') return gross === null || net === null ? null : gross - net
  if (metric === 'netSc') return addCents(net, sc)
  return addCents(net, sc, tax)
}

interface Row {
  outlet: Outlet
  label: string
  /** Cents per channel; null where the source does not state it. */
  cents: Record<ChannelId, bigint | null>
  /** Sum of the channels that do state an amount. Null when none do. */
  total: bigint | null
  /** A channel with an August source that this outlet does not report. */
  missing: ChannelId[]
  /** What Recharts draws with — numbers, derived last. */
  [series: string]: unknown
}

const buildRows = (outlets: Outlet[], metric: MetricId): Row[] => outlets
  .map(outlet => {
    const cents = Object.fromEntries(
      DATA.channels.map(channel => [channel, channelMetric(outlet.channels[channel], metric)]),
    ) as Record<ChannelId, bigint | null>
    const known = DATA.channels.filter(channel => cents[channel] !== null)
    const total = known.length ? known.reduce((sum, channel) => sum + cents[channel]!, 0n) : null
    const row: Row = {
      outlet,
      label: outlet.name.replace(/^US Pizza\s*/i, '') || outlet.name,
      cents,
      total,
      missing: DATA.sourcedChannels.filter(channel => outlet.channels[channel].status !== 'reported'),
      total_bar: total === null ? null : centsToNumber(total),
    }
    for (const channel of DATA.channels) row[channel] = cents[channel] === null ? null : centsToNumber(cents[channel]!)
    return row
  })
  .sort((left, right) => {
    const a = left.total ?? -1n
    const b = right.total ?? -1n
    if (a !== b) return b > a ? 1 : -1
    return left.outlet.name.localeCompare(right.outlet.name) || left.outlet.id.localeCompare(right.outlet.id)
  })

// --- controls ----------------------------------------------------------------

const ON = 'shrink-0 rounded-lg px-4 py-1.5 font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 bg-white text-slate-900 shadow-xs'
const OFF = 'shrink-0 rounded-lg px-4 py-1.5 font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 text-slate-600 hover:text-slate-900'

function Toggle<T extends string>({ options, value, onChange, label, tight }: {
  options: Array<{ id: T; label: string }>
  value: T
  onChange: (id: T) => void
  label: string
  tight?: boolean
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs scrollbar-none">
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
          className={`${option.id === value ? ON : OFF}${tight ? ' px-3 py-1' : ''}`}
        >{option.label}</button>
      ))}
    </div>
  )
}

// --- tooltip -----------------------------------------------------------------

function ChartTooltip({ active, payload, metric }: { active?: boolean; payload?: Array<{ payload: Row }>; metric: MetricId }) {
  const row = active && payload?.length ? payload[0].payload : null
  if (!row) return null
  const metricLabel = METRICS.find(m => m.id === metric)!.label
  return (
    <div style={{ maxWidth: 260 }} className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-md">
      <div className="font-bold text-slate-900">{row.outlet.name}</div>
      <div className="text-[11px] text-slate-500">{row.outlet.entity} · {metricLabel}</div>
      <dl className="mt-2 space-y-1">
        {DATA.channels.map(channel => (
          <div key={channel} className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-slate-600">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: CHANNEL_COLOR[channel] }} />
              {CHANNEL_LABEL[channel]}
            </dt>
            <dd className={`tabular-nums font-semibold ${row.cents[channel] === null ? 'text-slate-400' : 'text-slate-900'}`}>
              {RM(row.cents[channel])}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
        <span className="font-bold text-slate-700">{row.missing.length || DATA.unsourcedChannels.length ? 'Reported total' : 'Total'}</span>
        <span className="font-black tabular-nums text-slate-900">{RM(row.total)}</span>
      </div>
      {row.missing.length > 0 && (
        <p className="mt-1.5 rounded bg-amber-50 px-1.5 py-1 text-[11px] font-semibold text-amber-800">
          Partial coverage — no August {row.missing.map(c => CHANNEL_LABEL[c]).join(' or ')} report for this outlet. Its sales are unknown, not zero.
        </p>
      )}
    </div>
  )
}

// --- chart -------------------------------------------------------------------

/** Per-outlet row height for the horizontal layout, so the chart's own height
 *  scales with the outlet count instead of a fixed box that would squeeze bars. */
const ROW_HEIGHT = 32
const CHART_MARGIN = { top: 8, right: 16, left: 8, bottom: 8 }
const LABEL_WIDTH = 150

function Section4Chart({ scope, state }: { scope: 'all' | 'myUsPizza' | 'sabah'; state: { s4Metric?: MetricId; s4View?: 'total' | 'platform'; s4Search?: string; s4Sort?: 'high' | 'low' } }) {
  const [metric, setMetric] = useState<MetricId>(state.s4Metric ?? 'net')
  const [view, setView] = useState<'total' | 'platform'>(state.s4View ?? 'total')
  const [search, setSearch] = useState(state.s4Search ?? '')
  const [sort, setSort] = useState<'high' | 'low'>(state.s4Sort ?? 'high')
  const [pinnedId, setPinnedId] = useState<string | null>(null)

  useEffect(() => { state.s4Metric = metric; state.s4View = view; state.s4Search = search; state.s4Sort = sort }, [metric, view, search, sort, state])

  const animate = !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const outlets = useMemo(() => DATA.outlets.filter(outlet => {
    const sabah = outlet.entity.toLowerCase().includes('sabah')
    return scope === 'all' || (scope === 'sabah' ? sabah : !sabah)
  }), [scope])

  const allRows = useMemo(() => buildRows(outlets, metric), [outlets, metric])
  const rows = useMemo(() => allRows
    .filter(row => row.outlet.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a, b) => {
      const left = a.total ?? -1n, right = b.total ?? -1n
      return (sort === 'high' ? (right > left ? 1 : right < left ? -1 : 0) : (left > right ? 1 : left < right ? -1 : 0)) || a.label.localeCompare(b.label)
    }), [allRows, search, sort])
  const pinned = rows.find(row => row.outlet.id === pinnedId)
  const caption = METRICS.find(m => m.id === metric)!.caption
  const chartHeight = Math.max(rows.length * ROW_HEIGHT + CHART_MARGIN.top + CHART_MARGIN.bottom, 160)
  const partial = rows.filter(row => row.missing.length > 0).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Toggle label="Sales metric" options={METRICS.map(m => ({ id: m.id, label: m.label }))} value={metric} onChange={setMetric} />
        <Toggle label="Chart view" tight options={[{ id: 'total' as const, label: 'Total' }, { id: 'platform' as const, label: 'By platform' }]} value={view} onChange={setView} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Search outlets" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search outlet" style={{ maxWidth: 224 }}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-400" />
        <button type="button" onClick={() => setSort(value => value === 'high' ? 'low' : 'high')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400">
          {sort === 'high' ? 'High → Low' : 'Low → High'}
        </button>
      </div>
      {pinned && <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs shadow-sm" aria-live="polite">
        <ChartTooltip active payload={[{ payload: pinned }]} metric={metric} />
        <button type="button" onClick={() => setPinnedId(null)} className="shrink-0 font-semibold text-slate-500 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400" aria-label="Clear selected outlet">Clear</button>
      </div>}

      <div>
        <div className="text-xs font-bold text-slate-700">{caption} · sorted {sort === 'high' ? 'high → low' : 'low → high'}</div>
        <p className="mt-1 text-[11px] text-slate-500">
          POS is the cashier POS channel in its own right, summed alongside Grab, FoodPanda, Shopee and Apps — each source counted once.
          {' '}{DATA.unsourcedChannels.map(c => CHANNEL_LABEL[c.channel]).join(' and ')} have no August source, so no outlet's bar includes them and every bar is a reported-channel sum rather than a complete five-channel total.
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">{allRows.length ? 'No outlets match your search.' : 'No outlet is in this entity scope.'}</p>
      ) : rows.every(row => row.total === null) ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-xs font-semibold text-amber-800">
          No August source states {METRICS.find(m => m.id === metric)!.label} for these outlets. The figure is unknown, not zero.
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
            <ResponsiveContainer width="100%" height={chartHeight}>
              <BarChart
                layout="vertical"
                data={rows}
                margin={CHART_MARGIN}
                barCategoryGap="22%"
              >
                <CartesianGrid horizontal={false} stroke="#E2E8F0" />
                <XAxis
                  type="number"
                  tickFormatter={wholeRM}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  stroke="#CBD5E1"
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={LABEL_WIDTH}
                  interval={0}
                  tick={{ fontSize: 10, fill: '#64748B' }}
                  stroke="#CBD5E1"
                />
                <Tooltip content={<ChartTooltip metric={metric} />} cursor={{ fill: '#0B192C', fillOpacity: 0.04 }} />
                {view === 'platform'
                  ? DATA.channels.map(channel => (
                    <Bar
                      key={channel}
                      dataKey={channel}
                      name={CHANNEL_LABEL[channel]}
                      stackId="channels"
                      cursor="pointer"
                      onClick={(row: Row) => setPinnedId(id => id === row.outlet.id ? null : row.outlet.id)}
                      fill={CHANNEL_COLOR[channel]}
                      isAnimationActive={animate}
                      radius={channel === DATA.channels[DATA.channels.length - 1] ? [0, 3, 3, 0] : undefined}
                    />
                  ))
                  : (
                    <Bar
                      dataKey="total_bar"
                      name="Reported total"
                      fill="#0B192C"
                      cursor="pointer"
                      onClick={(row: Row) => setPinnedId(id => id === row.outlet.id ? null : row.outlet.id)}
                      isAnimationActive={animate}
                      radius={[0, 3, 3, 0]}
                    />
                  )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-slate-600">
            {DATA.channels.map(channel => {
              const unsourced = DATA.unsourcedChannels.some(entry => entry.channel === channel)
              return (
                <span key={channel} className={`flex items-center gap-1.5${unsourced ? ' text-slate-400' : ''}`}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: CHANNEL_COLOR[channel], opacity: unsourced ? 0.35 : 1 }} />
                  {CHANNEL_LABEL[channel]}{unsourced && <span className="italic"> — no August source</span>}
                </span>
              )
            })}
          </div>

          <p className="text-[11px] text-slate-500">
            {rows.length} outlet{rows.length === 1 ? '' : 's'}.
            {partial > 0 && <> {partial} outlet{partial === 1 ? '' : 's'} carr{partial === 1 ? 'ies' : 'y'} partial coverage; hover a bar to see which channel is unreported.</>}
            {DATA.definitionNotes.map(note => <span key={note}> {note}</span>)}
          </p>

          {/* The screen-reader equivalent of the chart. `sr-only` goes on a wrapping
              div, not the table: a table's own used width is at least its min-content
              width, so sr-only on the table itself leaks 900-odd px of page scroll. */}
          <div className="sr-only">
          <table>
            <caption>{caption}, August {DATA.reportingMonth}. An em dash means the source does not state the amount.</caption>
            <thead>
              <tr><th scope="col">Outlet</th>{DATA.channels.map(c => <th key={c} scope="col">{CHANNEL_LABEL[c]}</th>)}<th scope="col">Reported total</th></tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.outlet.id}>
                  <th scope="row">{row.outlet.name}</th>
                  {DATA.channels.map(c => <td key={c}>{RM(row.cents[c])}</td>)}
                  <td>{RM(row.total)}{row.missing.length ? ' (partial coverage)' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  )
}

// --- purchase charts ---------------------------------------------------------

interface PurchaseOutlet {
  id: string
  name: string
  entity: string
  purchases: number | null
  netSales: number | null
}
const PURCHASE_OUTLETS: PurchaseOutlet[] = JSON.parse(document.getElementById('SSR_DATA')!.textContent!).__matrix
type PurchaseSection = 'purchasesByOutlet' | 'purchasesToNetSales'
type PurchaseRow = PurchaseOutlet & { rate: number | null }
const purchaseMoney = (value: number) => `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const purchasePercent = (value: number) => `${value.toFixed(1)}%`

function PurchaseValueLabel({ x = 0, y = 0, width = 0, height = 0, value, ratio }: {
  x?: number; y?: number; width?: number; height?: number; value?: number; ratio: boolean
}) {
  return typeof value === 'number' ? <text x={x + width + 6} y={y + height / 2} dominantBaseline="middle" fill="#334155" fontSize={10} fontWeight={700} textAnchor="start">
    {ratio ? purchasePercent(value) : purchaseMoney(value)}
  </text> : null
}

function PurchaseChart({ scope, section, state }: {
  scope: 'all' | 'myUsPizza' | 'sabah'
  section: PurchaseSection
  state: { s5Search?: string; s5Sort?: 'high' | 'low'; s6Search?: string; s6Sort?: 'high' | 'low' }
}) {
  const ratio = section === 'purchasesToNetSales'
  const [search, setSearch] = useState((ratio ? state.s6Search : state.s5Search) ?? '')
  const [sort, setSort] = useState<'high' | 'low'>((ratio ? state.s6Sort : state.s5Sort) ?? 'high')
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  useEffect(() => {
    if (ratio) { state.s6Search = search; state.s6Sort = sort }
    else { state.s5Search = search; state.s5Sort = sort }
  }, [ratio, search, sort, state])

  const allRows = useMemo(() => PURCHASE_OUTLETS
    .filter(outlet => scope === 'all' || (scope === 'sabah' ? outlet.entity.toLowerCase().includes('sabah') : !outlet.entity.toLowerCase().includes('sabah')))
    .filter(outlet => outlet.purchases !== null && (!ratio || (outlet.netSales !== null && outlet.netSales !== 0)))
    .map(outlet => ({ ...outlet, rate: outlet.netSales ? outlet.purchases! / outlet.netSales * 100 : null })), [scope, ratio])
  const rows = useMemo(() => allRows
    .filter(row => row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
    .sort((a, b) => {
      const left = ratio ? a.rate! : a.purchases!, right = ratio ? b.rate! : b.purchases!
      return (sort === 'high' ? right - left : left - right) || a.name.localeCompare(b.name)
    }), [allRows, search, sort, ratio])
  const pinned = rows.find(row => row.id === pinnedId)

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <input aria-label="Search outlets" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search outlet" style={{ maxWidth: 224 }}
        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-400" />
      <button type="button" onClick={() => setSort(value => value === 'high' ? 'low' : 'high')}
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-slate-400">
        {sort === 'high' ? 'High → Low' : 'Low → High'}
      </button>
    </div>
    {pinned && <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs shadow-sm" aria-live="polite">
      <span><strong className="text-slate-900">{pinned.name}</strong><span className="ml-2 tabular-nums text-slate-700">
        {ratio ? `${purchasePercent(pinned.rate!)} · Purchases ${purchaseMoney(pinned.purchases!)} · Net sales ${purchaseMoney(pinned.netSales!)}` : `GRN purchases: ${purchaseMoney(pinned.purchases!)}`}
      </span></span>
      <button type="button" onClick={() => setPinnedId(null)} className="shrink-0 font-semibold text-slate-500 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-slate-400" aria-label="Clear selected outlet">Clear</button>
    </div>}
    <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 sm:p-4">
      {rows.length ? <ResponsiveContainer width="100%" height={Math.max(rows.length * 32 + 24, 160)}>
        <BarChart layout="vertical" data={rows} margin={{ top: 8, right: ratio ? 72 : 100, bottom: 8, left: 8 }} barCategoryGap="20%">
          <CartesianGrid horizontal={false} stroke="#E2E8F0" />
          <XAxis type="number" tickFormatter={(value: number) => ratio ? `${Math.round(value)}%` : `${Math.round(value / 1000)}k`} tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10, fill: '#334155' }} axisLine={false} tickLine={false} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const row = payload[0].payload as PurchaseRow
            return <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl">
              <div className="mb-1 font-bold text-slate-900">{row.name}</div>
              {ratio && <div className="tabular-nums text-slate-700">Purchases to net sales: {purchasePercent(row.rate!)}</div>}
              <div className="tabular-nums text-slate-700">GRN purchases: {purchaseMoney(row.purchases!)}</div>
              {ratio && <div className="tabular-nums text-slate-700">Net sales: {purchaseMoney(row.netSales!)}</div>}
            </div>
          }} />
          <Bar dataKey={ratio ? 'rate' : 'purchases'} name={ratio ? 'Purchases-to-Net Sales' : 'Purchases (GRN)'} fill={ratio ? '#14B8A6' : '#0284C7'} radius={[0, 3, 3, 0]} cursor="pointer"
            onClick={(row: PurchaseRow) => setPinnedId(id => id === row.id ? null : row.id)}>
            <LabelList dataKey={ratio ? 'rate' : 'purchases'} position="right" content={<PurchaseValueLabel ratio={ratio} />} />
          </Bar>
        </BarChart>
      </ResponsiveContainer> : <p className="py-8 text-center text-xs text-slate-500">No outlets match your search.</p>}
    </div>
    <p className="text-center text-[11px] text-slate-400">{rows.length} of {allRows.length} outlets, ranked {sort === 'high' ? 'high → low' : 'low → high'}</p>
  </div>
}

// --- shell bridge ------------------------------------------------------------

let root: Root | null = null

declare global {
  interface Window {
    __s4mount?: (element: HTMLElement | null, scope: 'all' | 'myUsPizza' | 'sabah', state: Record<string, unknown>) => void
    __s4unmount?: () => void
    __s56mount?: (element: HTMLElement | null, scope: 'all' | 'myUsPizza' | 'sabah', section: PurchaseSection, state: Record<string, unknown>) => void
  }
}

window.__s4mount = (element, scope, state) => {
  if (!element) return
  window.__s4unmount!()
  root = createRoot(element)
  root.render(<Section4Chart scope={scope} state={state as never} />)
}
window.__s56mount = (element, scope, section, state) => {
  if (!element) return
  window.__s4unmount!()
  root = createRoot(element)
  root.render(<PurchaseChart scope={scope} section={section} state={state as never} />)
}
window.__s4unmount = () => {
  root?.unmount()
  root = null
}
